import { Router } from "express";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Get current user's location sharing settings
router.get("/:familyId/settings/me", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const userId = req.user!.id;

  let settings = db.prepare(`
    SELECT * FROM location_sharing_settings WHERE family_id = ? AND user_id = ?
  `).get(familyId, userId) as any;

  if (!settings) {
    db.prepare(`
      INSERT INTO location_sharing_settings (family_id, user_id, enabled, precision)
      VALUES (?, ?, 0, 'approximate')
    `).run(familyId, userId);
    settings = db.prepare(`SELECT * FROM location_sharing_settings WHERE family_id = ? AND user_id = ?`).get(familyId, userId);
  }

  res.json({ settings });
});

// Update current user's location sharing settings (Opt-in / pause / precision)
router.put("/:familyId/settings/me", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const userId = req.user!.id;
  const { enabled, precision = "approximate", retentionDays = 7, durationMinutes } = req.body;

  let expiresAt: string | null = null;
  if (enabled && durationMinutes && parseInt(durationMinutes, 10) > 0) {
    const d = new Date();
    d.setMinutes(d.getMinutes() + parseInt(durationMinutes, 10));
    expiresAt = d.toISOString();
  }

  db.prepare(`
    INSERT INTO location_sharing_settings (family_id, user_id, enabled, precision, retention_days, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(family_id, user_id) DO UPDATE SET
      enabled = excluded.enabled,
      precision = excluded.precision,
      retention_days = excluded.retention_days,
      expires_at = excluded.expires_at,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    familyId,
    userId,
    enabled ? 1 : 0,
    precision === "precise" ? "precise" : "approximate",
    parseInt(retentionDays, 10) || 7,
    expiresAt
  );

  logAudit(familyId, userId, "LOCATION_SHARING_UPDATED", "location_sharing_settings", userId, { enabled, precision });

  const updated = db.prepare(`SELECT * FROM location_sharing_settings WHERE family_id = ? AND user_id = ?`).get(familyId, userId);
  res.json({ settings: updated });
});

// Post a new location record from authorized client device
router.post("/:familyId/records", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const userId = req.user!.id;
  const { latitude, longitude, accuracy } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Latitude and longitude are required." });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Invalid coordinate values." });
  }

  // Check if sharing is enabled
  const settings = db.prepare(`
    SELECT enabled, expires_at, precision FROM location_sharing_settings WHERE family_id = ? AND user_id = ?
  `).get(familyId, userId) as any;

  if (!settings || !settings.enabled) {
    return res.status(403).json({ error: "Location sharing is currently disabled in your settings." });
  }

  if (settings.expires_at && new Date(settings.expires_at) < new Date()) {
    db.prepare("UPDATE location_sharing_settings SET enabled = 0 WHERE family_id = ? AND user_id = ?").run(familyId, userId);
    return res.status(403).json({ error: "Location sharing duration has expired." });
  }

  // If precision is approximate, round coordinates to ~1km precision (approx 2 decimal places)
  let recordLat = lat;
  let recordLng = lng;
  if (settings.precision === "approximate") {
    recordLat = Math.round(lat * 100) / 100;
    recordLng = Math.round(lng * 100) / 100;
  }

  db.prepare(`
    INSERT INTO location_records (family_id, user_id, latitude, longitude, accuracy_m, recorded_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(familyId, userId, recordLat, recordLng, accuracy ? parseFloat(accuracy) : null);

  res.status(201).json({ message: "Location recorded successfully." });
});

// Get latest location of family members who have sharing enabled
router.get("/:familyId/latest", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);

  // Return only members with enabled sharing
  const records = db.prepare(`
    SELECT u.id as user_id, u.name, u.avatar_url,
           lr.latitude, lr.longitude, lr.accuracy_m, lr.recorded_at,
           lss.precision
    FROM location_sharing_settings lss
    JOIN users u ON u.id = lss.user_id
    JOIN (
      SELECT user_id, MAX(id) as max_id
      FROM location_records
      WHERE family_id = ?
      GROUP BY user_id
    ) latest_sub ON latest_sub.user_id = u.id
    JOIN location_records lr ON lr.id = latest_sub.max_id
    WHERE lss.family_id = ?
      AND lss.enabled = 1
      AND (lss.expires_at IS NULL OR datetime(lss.expires_at) > datetime('now'))
  `).all(familyId, familyId);

  res.json({ locations: records });
});

// Get location history of a member
router.get("/:familyId/history/:targetUserId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const targetUserId = parseInt(req.params.targetUserId, 10);
  const currentUserId = req.user!.id;

  const targetMember = db.prepare("SELECT * FROM family_memberships WHERE family_id = ? AND user_id = ?").get(familyId, targetUserId);
  if (!targetMember) {
    return res.status(404).json({ error: "Target member not found." });
  }

  // Must have sharing enabled unless requesting own history
  if (targetUserId !== currentUserId) {
    const settings = db.prepare("SELECT enabled FROM location_sharing_settings WHERE family_id = ? AND user_id = ?").get(familyId, targetUserId) as any;
    if (!settings || !settings.enabled) {
      return res.status(403).json({ error: "This member does not have location sharing enabled." });
    }
  }

  const history = db.prepare(`
    SELECT id, latitude, longitude, accuracy_m, recorded_at
    FROM location_records
    WHERE family_id = ? AND user_id = ?
    ORDER BY recorded_at DESC
    LIMIT 100
  `).all(familyId, targetUserId);

  res.json({ history });
});

// Delete own location history
router.delete("/:familyId/history/me", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const userId = req.user!.id;

  const result = db.prepare("DELETE FROM location_records WHERE family_id = ? AND user_id = ?").run(familyId, userId);
  logAudit(familyId, userId, "LOCATION_HISTORY_DELETED", "location_records", userId, { deletedCount: result.changes });

  res.json({ message: "Location history permanently deleted.", deletedCount: result.changes });
});

export default router;
