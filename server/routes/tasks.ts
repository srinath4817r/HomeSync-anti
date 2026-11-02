import { Router } from "express";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// List household tasks
router.get("/:familyId/tasks", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { status, category } = req.query;

  let query = `
    SELECT t.*, c.name as creator_name, a.name as assignee_name, comp.name as completed_by_name
    FROM tasks t
    JOIN users c ON c.id = t.creator_user_id
    LEFT JOIN users a ON a.id = t.assigned_to_user_id
    LEFT JOIN users comp ON comp.id = t.completed_by_user_id
    WHERE t.family_id = ?
  `;
  const params: any[] = [familyId];

  if (status && typeof status === "string") {
    query += ` AND t.status = ?`;
    params.push(status);
  }
  if (category && typeof category === "string") {
    query += ` AND t.category = ?`;
    params.push(category);
  }

  query += ` ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.due_date ASC`;

  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

// Create task
router.post("/:familyId/tasks", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { title, description, priority = "medium", category = "General", dueDate, assignedToUserId } = req.body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "Task title is required." });
  }

  const insert = db.prepare(`
    INSERT INTO tasks (family_id, creator_user_id, title, description, priority, category, due_date, assigned_to_user_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);

  const result = insert.run(
    familyId,
    req.user!.id,
    title.trim(),
    description || null,
    priority,
    category,
    dueDate || null,
    assignedToUserId || null
  );

  const taskId = Number(result.lastInsertRowid);
  logAudit(familyId, req.user!.id, "TASK_CREATED", "task", taskId, { title: title.trim(), priority });

  const task = db.prepare(`
    SELECT t.*, c.name as creator_name, a.name as assignee_name
    FROM tasks t
    JOIN users c ON c.id = t.creator_user_id
    LEFT JOIN users a ON a.id = t.assigned_to_user_id
    WHERE t.id = ?
  `).get(taskId);

  res.status(201).json({ task });
});

// Update task (status, assignment, details)
router.patch("/:familyId/tasks/:taskId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const taskId = parseInt(req.params.taskId, 10);
  const { title, description, priority, category, dueDate, assignedToUserId, status } = req.body;

  const existing = db.prepare("SELECT * FROM tasks WHERE id = ? AND family_id = ?").get(taskId, familyId) as any;
  if (!existing) {
    return res.status(404).json({ error: "Task not found." });
  }

  let completedAt = existing.completed_at;
  let completedBy = existing.completed_by_user_id;

  if (status === "completed" && existing.status !== "completed") {
    completedAt = new Date().toISOString();
    completedBy = req.user!.id;
  } else if (status && status !== "completed") {
    completedAt = null;
    completedBy = null;
  }

  db.prepare(`
    UPDATE tasks
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        priority = COALESCE(?, priority),
        category = COALESCE(?, category),
        due_date = COALESCE(?, due_date),
        assigned_to_user_id = COALESCE(?, assigned_to_user_id),
        status = COALESCE(?, status),
        completed_at = ?,
        completed_by_user_id = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title !== undefined ? title.trim() : null,
    description !== undefined ? description : null,
    priority !== undefined ? priority : null,
    category !== undefined ? category : null,
    dueDate !== undefined ? dueDate : null,
    assignedToUserId !== undefined ? assignedToUserId : null,
    status !== undefined ? status : null,
    completedAt,
    completedBy,
    taskId
  );

  logAudit(familyId, req.user!.id, "TASK_UPDATED", "task", taskId, req.body);

  const updated = db.prepare(`
    SELECT t.*, c.name as creator_name, a.name as assignee_name, comp.name as completed_by_name
    FROM tasks t
    JOIN users c ON c.id = t.creator_user_id
    LEFT JOIN users a ON a.id = t.assigned_to_user_id
    LEFT JOIN users comp ON comp.id = t.completed_by_user_id
    WHERE t.id = ?
  `).get(taskId);

  res.json({ task: updated });
});

// Delete task
router.delete("/:familyId/tasks/:taskId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const taskId = parseInt(req.params.taskId, 10);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND family_id = ?").get(taskId, familyId) as any;
  if (!task) {
    return res.status(404).json({ error: "Task not found." });
  }

  db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
  logAudit(familyId, req.user!.id, "TASK_DELETED", "task", taskId, { title: task.title });

  res.json({ message: "Task deleted successfully." });
});

export default router;
