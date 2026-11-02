import { Router } from "express";
import db from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Aggregate real live dashboard queries (Rule 1 & Rule 4 - strictly no fake data)
router.get("/:familyId/summary", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const userId = req.user!.id;
  const today = new Date().toISOString().split("T")[0];

  // 1. Events today
  const todayEvents = db.prepare(`
    SELECT id, title, starts_at, ends_at, priority, location_name, assigned_to_user_id
    FROM calendar_events
    WHERE family_id = ?
      AND (visibility = 'family' OR owner_user_id = ? OR assigned_to_user_id = ?)
      AND date(starts_at) = date('now')
    ORDER BY starts_at ASC
  `).all(familyId, userId, userId);

  // 2. Pending Tasks
  const pendingTasks = db.prepare(`
    SELECT t.*, u.name as assignee_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to_user_id
    WHERE t.family_id = ? AND t.status IN ('pending', 'in_progress')
    ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.due_date ASC
    LIMIT 10
  `).all(familyId);

  const taskStats = db.prepare(`
    SELECT 
      count(1) as total_pending,
      sum(CASE WHEN assigned_to_user_id = ? THEN 1 ELSE 0 END) as assigned_to_me,
      sum(CASE WHEN priority IN ('urgent', 'high') THEN 1 ELSE 0 END) as urgent_count
    FROM tasks
    WHERE family_id = ? AND status IN ('pending', 'in_progress')
  `).get(userId, familyId) as any;

  // 3. Groceries
  const groceryStats = db.prepare(`
    SELECT 
      count(1) as total_items,
      sum(CASE WHEN checked = 0 THEN 1 ELSE 0 END) as unchecked_items
    FROM grocery_items
    WHERE family_id = ?
  `).get(familyId) as any;

  // 4. Medicine Reminders Today
  const upcomingMedicine = db.prepare(`
    SELECT mo.id, mo.scheduled_for, mo.status, cp.medicine_name, cp.dosage_info, u.name as subject_name
    FROM medicine_occurrences mo
    JOIN care_plans cp ON cp.id = mo.schedule_id
    JOIN users u ON u.id = cp.subject_user_id
    WHERE cp.family_id = ?
      AND date(mo.scheduled_for) = date('now')
      AND (mo.status = 'scheduled' OR mo.status = 'delivered')
    ORDER BY mo.scheduled_for ASC
    LIMIT 5
  `).all(familyId);

  // 5. Unpaid Bills
  const billStats = db.prepare(`
    SELECT 
      count(1) as unpaid_count,
      COALESCE(sum(amount), 0) as total_unpaid_amount
    FROM bills
    WHERE family_id = ? AND status = 'unpaid'
  `).get(familyId) as any;

  // 6. Active Requests
  const activeRequestsCount = db.prepare(`
    SELECT count(1) as count
    FROM service_requests
    WHERE family_id = ? AND status IN ('Submitted', 'Accepted', 'In progress')
  `).get(familyId) as any;

  // 7. Members with active location sharing
  const activeSharers = db.prepare(`
    SELECT u.id, u.name, u.avatar_url, lss.precision,
           (SELECT recorded_at FROM location_records WHERE user_id = u.id ORDER BY recorded_at DESC LIMIT 1) as last_seen
    FROM location_sharing_settings lss
    JOIN users u ON u.id = lss.user_id
    WHERE lss.family_id = ? AND lss.enabled = 1
  `).all(familyId);

  res.json({
    todayEvents,
    pendingTasks,
    taskStats: {
      totalPending: taskStats.total_pending || 0,
      assignedToMe: taskStats.assigned_to_me || 0,
      urgentCount: taskStats.urgent_count || 0,
    },
    groceryStats: {
      total: groceryStats.total_items || 0,
      unchecked: groceryStats.unchecked_items || 0,
    },
    upcomingMedicine,
    billStats: {
      unpaidCount: billStats.unpaid_count || 0,
      totalAmount: billStats.total_unpaid_amount || 0,
    },
    activeRequestsCount: activeRequestsCount.count || 0,
    activeSharers,
  });
});

export default router;
