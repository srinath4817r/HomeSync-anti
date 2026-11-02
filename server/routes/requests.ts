import { Router } from "express";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// List household service requests
router.get("/:familyId/requests", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { status, category } = req.query;

  let query = `
    SELECT sr.*, c.name as creator_name, a.name as assignee_name
    FROM service_requests sr
    JOIN users c ON c.id = sr.creator_user_id
    LEFT JOIN users a ON a.id = sr.assigned_to_user_id
    WHERE sr.family_id = ?
  `;
  const params: any[] = [familyId];

  if (status && typeof status === "string") {
    query += ` AND sr.status = ?`;
    params.push(status);
  }
  if (category && typeof category === "string") {
    query += ` AND sr.category = ?`;
    params.push(category);
  }

  query += ` ORDER BY sr.created_at DESC`;

  const requests = db.prepare(query).all(...params);
  res.json({ requests });
});

// Create service request
router.post("/:familyId/requests", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { title, category, description, priority = "normal", assignedToUserId } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: "Title, category, and description are required." });
  }

  const insert = db.prepare(`
    INSERT INTO service_requests (family_id, creator_user_id, title, category, description, priority, assigned_to_user_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Submitted')
  `);

  const result = insert.run(
    familyId,
    req.user!.id,
    title.trim(),
    category,
    description.trim(),
    priority,
    assignedToUserId || null
  );

  const reqId = Number(result.lastInsertRowid);
  logAudit(familyId, req.user!.id, "REQUEST_SUBMITTED", "service_request", reqId, { title, category });

  const request = db.prepare(`
    SELECT sr.*, c.name as creator_name, a.name as assignee_name
    FROM service_requests sr
    JOIN users c ON c.id = sr.creator_user_id
    LEFT JOIN users a ON a.id = sr.assigned_to_user_id
    WHERE sr.id = ?
  `).get(reqId);

  res.status(201).json({ request });
});

// Update request status (Accept, In progress, Complete, Decline)
router.patch("/:familyId/requests/:requestId/status", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const requestId = parseInt(req.params.requestId, 10);
  const { status, notes, assignedToUserId } = req.body;

  const validStatuses = ["Draft", "Submitted", "Accepted", "In progress", "Completed", "Declined", "Cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  const existing = db.prepare("SELECT * FROM service_requests WHERE id = ? AND family_id = ?").get(requestId, familyId) as any;
  if (!existing) {
    return res.status(404).json({ error: "Request not found." });
  }

  let acceptedAt = existing.accepted_at;
  let completedAt = existing.completed_at;

  if (status === "Accepted" && !existing.accepted_at) {
    acceptedAt = new Date().toISOString();
  }
  if (status === "Completed") {
    completedAt = new Date().toISOString();
  }

  db.prepare(`
    UPDATE service_requests
    SET status = ?,
        notes = COALESCE(?, notes),
        assigned_to_user_id = COALESCE(?, assigned_to_user_id),
        accepted_at = ?,
        completed_at = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, notes || null, assignedToUserId || null, acceptedAt, completedAt, requestId);

  logAudit(familyId, req.user!.id, "REQUEST_STATUS_UPDATED", "service_request", requestId, { oldStatus: existing.status, newStatus: status });

  const updated = db.prepare(`
    SELECT sr.*, c.name as creator_name, a.name as assignee_name
    FROM service_requests sr
    JOIN users c ON c.id = sr.creator_user_id
    LEFT JOIN users a ON a.id = sr.assigned_to_user_id
    WHERE sr.id = ?
  `).get(requestId);

  res.json({ request: updated });
});

export default router;
