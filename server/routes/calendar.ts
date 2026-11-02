import { Router } from "express";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Get calendar events for date range with recurrence expansion
router.get("/:familyId/events", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const userId = req.user!.id;
  const { start, end } = req.query;

  let query = `
    SELECT e.*, u.name as owner_name, a.name as assignee_name
    FROM calendar_events e
    JOIN users u ON u.id = e.owner_user_id
    LEFT JOIN users a ON a.id = e.assigned_to_user_id
    WHERE e.family_id = ?
      AND (e.visibility = 'family' OR e.owner_user_id = ? OR e.assigned_to_user_id = ?)
  `;
  const params: any[] = [familyId, userId, userId];

  if (start && typeof start === "string") {
    query += ` AND (e.starts_at >= ? OR e.recurrence_rule != 'none')`;
    params.push(start);
  }
  if (end && typeof end === "string") {
    query += ` AND (e.starts_at <= ? OR e.recurrence_rule != 'none')`;
    params.push(end);
  }

  query += ` ORDER BY e.starts_at ASC`;

  const rawEvents = db.prepare(query).all(...params) as any[];

  // Expand recurring events within requested window if start & end are specified
  const expandedEvents: any[] = [];
  const rangeStart = start ? new Date(start as string) : new Date(Date.now() - 30 * 86400000);
  const rangeEnd = end ? new Date(end as string) : new Date(Date.now() + 60 * 86400000);

  for (const event of rawEvents) {
    if (!event.recurrence_rule || event.recurrence_rule === "none") {
      expandedEvents.push(event);
      continue;
    }

    // Add base event if in range
    const eventStart = new Date(event.starts_at);
    const durationMs = event.ends_at ? new Date(event.ends_at).getTime() - eventStart.getTime() : 3600000;

    let cursor = new Date(eventStart);
    let count = 0;
    while (cursor <= rangeEnd && count < 60) {
      if (cursor >= rangeStart) {
        expandedEvents.push({
          ...event,
          id: count === 0 ? event.id : `${event.id}_rec_${count}`,
          is_occurrence: count > 0,
          original_event_id: event.id,
          starts_at: cursor.toISOString(),
          ends_at: new Date(cursor.getTime() + durationMs).toISOString(),
        });
      }

      if (event.recurrence_rule === "daily") {
        cursor.setDate(cursor.getDate() + 1);
      } else if (event.recurrence_rule === "weekly") {
        cursor.setDate(cursor.getDate() + 7);
      } else if (event.recurrence_rule === "monthly") {
        cursor.setMonth(cursor.getMonth() + 1);
      } else {
        break;
      }
      count++;
    }
  }

  res.json({ events: expandedEvents });
});

// Create calendar event
router.post("/:familyId/events", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const {
    title,
    description,
    startsAt,
    endsAt,
    locationName,
    priority = "normal",
    recurrenceRule = "none",
    assignedToUserId,
    visibility = "family",
  } = req.body;

  if (!title || typeof title !== "string" || !startsAt) {
    return res.status(400).json({ error: "Title and start time are required." });
  }

  const insert = db.prepare(`
    INSERT INTO calendar_events (
      family_id, owner_user_id, title, description, starts_at, ends_at,
      location_name, priority, recurrence_rule, assigned_to_user_id, visibility
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    familyId,
    req.user!.id,
    title.trim(),
    description || null,
    startsAt,
    endsAt || null,
    locationName || null,
    priority,
    recurrenceRule,
    assignedToUserId || null,
    visibility
  );

  const eventId = Number(result.lastInsertRowid);
  logAudit(familyId, req.user!.id, "EVENT_CREATED", "calendar_event", eventId, { title });

  const event = db.prepare(`
    SELECT e.*, u.name as owner_name, a.name as assignee_name
    FROM calendar_events e
    JOIN users u ON u.id = e.owner_user_id
    LEFT JOIN users a ON a.id = e.assigned_to_user_id
    WHERE e.id = ?
  `).get(eventId);

  res.status(201).json({ event });
});

// Update calendar event
router.patch("/:familyId/events/:eventId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const eventId = parseInt(req.params.eventId, 10);
  const { title, description, startsAt, endsAt, locationName, priority, status, recurrenceRule, assignedToUserId, visibility } = req.body;

  const event = db.prepare("SELECT * FROM calendar_events WHERE id = ? AND family_id = ?").get(eventId, familyId) as any;
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  // Check update permissions (owner or admin)
  const isAdmin = ["admin_primary", "admin", "parent"].includes(req.familyMembership!.role);
  if (event.owner_user_id !== req.user!.id && !isAdmin) {
    return res.status(403).json({ error: "Only the event creator or family admin can update this event." });
  }

  db.prepare(`
    UPDATE calendar_events
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        starts_at = COALESCE(?, starts_at),
        ends_at = COALESCE(?, ends_at),
        location_name = COALESCE(?, location_name),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        recurrence_rule = COALESCE(?, recurrence_rule),
        assigned_to_user_id = COALESCE(?, assigned_to_user_id),
        visibility = COALESCE(?, visibility),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title !== undefined ? title.trim() : null,
    description !== undefined ? description : null,
    startsAt !== undefined ? startsAt : null,
    endsAt !== undefined ? endsAt : null,
    locationName !== undefined ? locationName : null,
    priority !== undefined ? priority : null,
    status !== undefined ? status : null,
    recurrenceRule !== undefined ? recurrenceRule : null,
    assignedToUserId !== undefined ? assignedToUserId : null,
    visibility !== undefined ? visibility : null,
    eventId
  );

  logAudit(familyId, req.user!.id, "EVENT_UPDATED", "calendar_event", eventId, req.body);

  const updated = db.prepare(`
    SELECT e.*, u.name as owner_name, a.name as assignee_name
    FROM calendar_events e
    JOIN users u ON u.id = e.owner_user_id
    LEFT JOIN users a ON a.id = e.assigned_to_user_id
    WHERE e.id = ?
  `).get(eventId);

  res.json({ event: updated });
});

// Delete calendar event
router.delete("/:familyId/events/:eventId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const eventId = parseInt(req.params.eventId, 10);

  const event = db.prepare("SELECT * FROM calendar_events WHERE id = ? AND family_id = ?").get(eventId, familyId) as any;
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  const isAdmin = ["admin_primary", "admin", "parent"].includes(req.familyMembership!.role);
  if (event.owner_user_id !== req.user!.id && !isAdmin) {
    return res.status(403).json({ error: "Unauthorized to delete this event." });
  }

  db.prepare("DELETE FROM calendar_events WHERE id = ?").run(eventId);
  logAudit(familyId, req.user!.id, "EVENT_DELETED", "calendar_event", eventId, { title: event.title });

  res.json({ message: "Event deleted successfully." });
});

export default router;
