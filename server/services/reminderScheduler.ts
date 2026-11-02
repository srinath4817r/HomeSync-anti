import db, { logAudit } from "../db/database";

let intervalId: NodeJS.Timeout | null = null;

export function startReminderScheduler(pollIntervalMs = 30000) {
  if (intervalId) return;

  console.log(`[Scheduler] Medicine reminder & escalation worker started (poll every ${pollIntervalMs / 1000}s).`);

  intervalId = setInterval(() => {
    try {
      processReminders();
    } catch (err: any) {
      console.error("[Scheduler] Error in reminder scheduler:", err.message);
    }
  }, pollIntervalMs);

  // Run immediately on boot
  processReminders();
}

export function stopReminderScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[Scheduler] Reminder worker stopped.");
  }
}

function processReminders() {
  // 1. Deliver pending reminders
  const dueOccurrences = db.prepare(`
    SELECT mo.id, mo.subject_user_id, mo.scheduled_for, cp.family_id, cp.medicine_name, cp.dosage_info
    FROM medicine_occurrences mo
    JOIN care_plans cp ON cp.id = mo.schedule_id
    WHERE mo.status = 'scheduled'
      AND datetime(mo.scheduled_for) <= datetime('now')
  `).all() as any[];

  for (const occ of dueOccurrences) {
    db.transaction(() => {
      db.prepare(`
        UPDATE medicine_occurrences
        SET status = 'delivered', reminder_delivered_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(occ.id);

      // Create notification for subject
      db.prepare(`
        INSERT INTO notifications (user_id, family_id, title, body, type, link_url)
        VALUES (?, ?, ?, ?, 'reminder', '/care')
      `).run(
        occ.subject_user_id,
        occ.family_id,
        `Time to take your medication: ${occ.medicine_name}`,
        `Dosage: ${occ.dosage_info}. Please remember to record when taken.`
      );
    })();
  }

  // 2. Escalation check: unacknowledged reminders delivered >= escalation_after_minutes
  const escalations = db.prepare(`
    SELECT mo.id, mo.subject_user_id, mo.reminder_delivered_at, cp.family_id, cp.medicine_name,
           cp.dosage_info, cp.escalation_after_minutes, u.name as subject_name
    FROM medicine_occurrences mo
    JOIN care_plans cp ON cp.id = mo.schedule_id
    JOIN users u ON u.id = mo.subject_user_id
    WHERE mo.status IN ('delivered', 'snoozed')
      AND mo.alert_acknowledged_at IS NULL
      AND mo.outcome IS NULL
      AND datetime(mo.reminder_delivered_at, '+' || cp.escalation_after_minutes || ' minutes') <= datetime('now')
  `).all() as any[];

  for (const esc of escalations) {
    // Find caregivers assigned to this subject
    const caregivers = db.prepare(`
      SELECT caregiver_user_id FROM caregiver_assignments
      WHERE family_id = ? AND subject_user_id = ?
    `).all(esc.family_id, esc.subject_user_id) as any[];

    db.transaction(() => {
      db.prepare(`
        UPDATE medicine_occurrences
        SET status = 'escalated'
        WHERE id = ?
      `).run(esc.id);

      logAudit(esc.family_id, null, "MEDICINE_REMINDER_ESCALATED", "medicine_occurrence", esc.id, {
        medicine: esc.medicine_name,
        subject: esc.subject_name,
      });

      // Send urgent alert to each caregiver
      for (const cg of caregivers) {
        db.prepare(`
          INSERT INTO notifications (user_id, family_id, title, body, type, link_url)
          VALUES (?, ?, ?, ?, 'escalation', '/care')
        `).run(
          cg.caregiver_user_id,
          esc.family_id,
          `⚠️ Caregiver Alert: ${esc.subject_name} has not taken ${esc.medicine_name}`,
          `Prescribed dosage: ${esc.dosage_info}. Scheduled delivery time has passed without acknowledgment.`
        );
      }
    })();
  }
}
