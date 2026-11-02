import { Router } from "express";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Get care overview for a household
router.get("/:familyId/overview", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const currentUserId = req.user!.id;

  // Active care plans
  const carePlans = db.prepare(`
    SELECT cp.*, s.name as subject_name, s.avatar_url as subject_avatar, c.name as creator_name
    FROM care_plans cp
    JOIN users s ON s.id = cp.subject_user_id
    JOIN users c ON c.id = cp.creator_user_id
    WHERE cp.family_id = ? AND cp.active = 1
    ORDER BY cp.created_at DESC
  `).all(familyId);

  // Today's and upcoming occurrences
  const occurrences = db.prepare(`
    SELECT mo.*, cp.medicine_name, cp.dosage_info, s.name as subject_name,
           ack.name as acknowledged_by_name, out_u.name as outcome_by_name
    FROM medicine_occurrences mo
    JOIN care_plans cp ON cp.id = mo.schedule_id
    JOIN users s ON s.id = mo.subject_user_id
    LEFT JOIN users ack ON ack.id = mo.alert_acknowledged_by
    LEFT JOIN users out_u ON out_u.id = mo.outcome_recorded_by
    WHERE cp.family_id = ?
    ORDER BY mo.scheduled_for DESC
    LIMIT 50
  `).all(familyId);

  // Caregiver assignments
  const caregivers = db.prepare(`
    SELECT ca.*, s.name as subject_name, cg.name as caregiver_name
    FROM caregiver_assignments ca
    JOIN users s ON s.id = ca.subject_user_id
    JOIN users cg ON cg.id = ca.caregiver_user_id
    WHERE ca.family_id = ?
  `).all(familyId);

  res.json({
    carePlans,
    occurrences,
    caregivers,
  });
});

// Create Care Plan (Human-entered dosage, Rule 10 strictly enforced: never AI generated)
router.post("/:familyId/plans", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const {
    subjectUserId,
    medicineName,
    dosageInfo,
    prescribedInstructions,
    scheduledTimes, // array e.g. ["09:00", "21:00"]
    daysOfWeek = [0, 1, 2, 3, 4, 5, 6],
    timezone = "UTC",
    startsOn,
    endsOn,
    repeatAfterMinutes = 15,
    escalationAfterMinutes = 30,
    escalationIntervalMinutes = 15,
  } = req.body;

  if (!medicineName || !dosageInfo || !scheduledTimes || !startsOn) {
    return res.status(400).json({ error: "Medicine name, dosage info, scheduled times, and start date are required." });
  }

  const targetSubjectId = subjectUserId ? parseInt(subjectUserId, 10) : req.user!.id;

  const timesJson = Array.isArray(scheduledTimes) ? JSON.stringify(scheduledTimes) : JSON.stringify([scheduledTimes]);
  const daysJson = Array.isArray(daysOfWeek) ? JSON.stringify(daysOfWeek) : JSON.stringify([0, 1, 2, 3, 4, 5, 6]);

  const insert = db.prepare(`
    INSERT INTO care_plans (
      family_id, subject_user_id, creator_user_id, medicine_name, dosage_info,
      prescribed_instructions, scheduled_times, days_of_week, timezone,
      starts_on, ends_on, repeat_after_minutes, escalation_after_minutes,
      escalation_interval_minutes, active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const result = insert.run(
    familyId,
    targetSubjectId,
    req.user!.id,
    medicineName.trim(),
    dosageInfo.trim(),
    prescribedInstructions || null,
    timesJson,
    daysJson,
    timezone,
    startsOn,
    endsOn || null,
    parseInt(repeatAfterMinutes, 10) || 15,
    parseInt(escalationAfterMinutes, 10) || 30,
    parseInt(escalationIntervalMinutes, 10) || 15
  );

  const planId = Number(result.lastInsertRowid);

  // Generate initial occurrences for today and tomorrow
  const times: string[] = JSON.parse(timesJson);
  const now = new Date();
  for (let offset = 0; offset <= 1; offset++) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + offset);
    const dateStr = targetDate.toISOString().split("T")[0];

    for (const timeStr of times) {
      const scheduledDateTime = `${dateStr}T${timeStr}:00Z`;
      db.prepare(`
        INSERT INTO medicine_occurrences (schedule_id, subject_user_id, scheduled_for, status)
        VALUES (?, ?, ?, 'scheduled')
      `).run(planId, targetSubjectId, scheduledDateTime);
    }
  }

  logAudit(familyId, req.user!.id, "CARE_PLAN_CREATED", "care_plans", planId, { medicineName, dosageInfo });

  const plan = db.prepare("SELECT * FROM care_plans WHERE id = ?").get(planId);
  res.status(201).json({ plan });
});

// Acknowledge Medicine Alert
router.post("/:familyId/occurrences/:occurrenceId/acknowledge", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const occurrenceId = parseInt(req.params.occurrenceId, 10);

  const occ = db.prepare(`
    SELECT mo.*, cp.family_id
    FROM medicine_occurrences mo
    JOIN care_plans cp ON cp.id = mo.schedule_id
    WHERE mo.id = ? AND cp.family_id = ?
  `).get(occurrenceId, familyId) as any;

  if (!occ) {
    return res.status(404).json({ error: "Medicine occurrence not found." });
  }

  db.prepare(`
    UPDATE medicine_occurrences
    SET status = 'acknowledged',
        alert_acknowledged_at = CURRENT_TIMESTAMP,
        alert_acknowledged_by = ?
    WHERE id = ?
  `).run(req.user!.id, occurrenceId);

  logAudit(familyId, req.user!.id, "MEDICINE_ACKNOWLEDGED", "medicine_occurrence", occurrenceId, null);
  res.json({ message: "Reminder acknowledged." });
});

// Record Outcome (Taken, Skipped, Snoozed)
router.post("/:familyId/occurrences/:occurrenceId/outcome", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const occurrenceId = parseInt(req.params.occurrenceId, 10);
  const { outcome, note } = req.body; // 'taken', 'skipped', 'snoozed'

  if (!["taken", "skipped", "snoozed"].includes(outcome)) {
    return res.status(400).json({ error: "Invalid outcome. Must be 'taken', 'skipped', or 'snoozed'." });
  }

  const occ = db.prepare(`
    SELECT mo.*, cp.family_id
    FROM medicine_occurrences mo
    JOIN care_plans cp ON cp.id = mo.schedule_id
    WHERE mo.id = ? AND cp.family_id = ?
  `).get(occurrenceId, familyId) as any;

  if (!occ) {
    return res.status(404).json({ error: "Medicine occurrence not found." });
  }

  const status = outcome === "taken" ? "taken" : outcome === "skipped" ? "skipped" : "snoozed";

  db.prepare(`
    UPDATE medicine_occurrences
    SET status = ?,
        outcome = ?,
        outcome_note = ?,
        outcome_recorded_at = CURRENT_TIMESTAMP,
        outcome_recorded_by = ?
    WHERE id = ?
  `).run(status, outcome, note || null, req.user!.id, occurrenceId);

  logAudit(familyId, req.user!.id, "MEDICINE_OUTCOME_RECORDED", "medicine_occurrence", occurrenceId, { outcome, note });

  res.json({ message: `Medicine marked as ${outcome}.` });
});

// Assign Caregivers
router.put("/:familyId/caregivers/:subjectUserId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const subjectUserId = parseInt(req.params.subjectUserId, 10);
  const { caregiverUserIds } = req.body; // array of user IDs

  if (!Array.isArray(caregiverUserIds)) {
    return res.status(400).json({ error: "caregiverUserIds array is required." });
  }

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM caregiver_assignments WHERE family_id = ? AND subject_user_id = ?").run(familyId, subjectUserId);

    const insert = db.prepare("INSERT INTO caregiver_assignments (family_id, subject_user_id, caregiver_user_id) VALUES (?, ?, ?)");
    for (const cgId of caregiverUserIds) {
      insert.run(familyId, subjectUserId, parseInt(cgId, 10));
    }
  });

  tx();
  logAudit(familyId, req.user!.id, "CAREGIVERS_ASSIGNED", "caregiver_assignments", subjectUserId, { caregiverUserIds });

  res.json({ message: "Caregiver assignments updated successfully." });
});

export default router;
