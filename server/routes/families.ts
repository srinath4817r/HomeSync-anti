import { Router } from "express";
import crypto from "crypto";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  requireRole,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Public invitation preview
router.get("/invitations/preview/:token", (req, res) => {
  const { token } = req.params;

  const invitation = db.prepare(`
    SELECT i.id, i.token, i.role, i.max_uses, i.used_count, i.expires_at, i.revoked_at,
           f.id as family_id, f.name as family_name, f.description as family_description,
           u.name as inviter_name
    FROM invitations i
    JOIN families f ON f.id = i.family_id
    JOIN users u ON u.id = i.created_by_user_id
    WHERE i.token = ?
  `).get(token) as any;

  if (!invitation) {
    return res.status(404).json({ error: "Invitation not found or invalid." });
  }

  if (invitation.revoked_at) {
    return res.status(410).json({ error: "This invitation link has been revoked." });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return res.status(410).json({ error: "This invitation link has expired." });
  }

  if (invitation.used_count >= invitation.max_uses) {
    return res.status(410).json({ error: "This invitation link has reached its maximum uses." });
  }

  res.json({
    familyId: invitation.family_id,
    familyName: invitation.family_name,
    familyDescription: invitation.family_description,
    inviterName: invitation.inviter_name,
    suggestedRole: invitation.role,
  });
});

// Join family with invitation token
router.post("/join", authenticate, (req: AuthenticatedRequest, res) => {
  const { token, requestedRole } = req.body;
  const user = req.user!;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Invitation token is required." });
  }

  const invitation = db.prepare(`
    SELECT i.*, f.capacity,
           (SELECT count(1) FROM family_memberships WHERE family_id = f.id AND status = 'active') as active_members_count
    FROM invitations i
    JOIN families f ON f.id = i.family_id
    WHERE i.token = ?
  `).get(token) as any;

  if (!invitation) {
    return res.status(404).json({ error: "Invitation not found or invalid." });
  }

  if (invitation.revoked_at) {
    return res.status(410).json({ error: "Invitation link has been revoked." });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return res.status(410).json({ error: "Invitation link has expired." });
  }

  if (invitation.used_count >= invitation.max_uses) {
    return res.status(410).json({ error: "Invitation maximum usage exceeded." });
  }

  if (invitation.active_members_count >= invitation.capacity) {
    return res.status(400).json({ error: "Household has reached maximum member capacity (" + invitation.capacity + ")." });
  }

  // Check if already a member
  const existing = db.prepare(`
    SELECT * FROM family_memberships WHERE family_id = ? AND user_id = ?
  `).get(invitation.family_id, user.id) as any;

  if (existing) {
    if (existing.status === "active") {
      return res.status(400).json({ error: "You are already a member of this household." });
    }
    return res.status(400).json({ error: "You already have a pending or existing membership in this household." });
  }

  const roleToGrant = invitation.role || "member";
  const userRequestedRole = requestedRole || roleToGrant;

  const joinTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO family_memberships (family_id, user_id, role, status, requested_role)
      VALUES (?, ?, ?, 'active', ?)
    `).run(invitation.family_id, user.id, roleToGrant, userRequestedRole);

    db.prepare(`
      UPDATE invitations
      SET used_count = used_count + 1
      WHERE id = ?
    `).run(invitation.id);

    logAudit(invitation.family_id, user.id, "MEMBER_JOINED", "family_membership", invitation.family_id, {
      role: roleToGrant,
      tokenUsed: token,
    });
  });

  joinTx();

  const family = db.prepare("SELECT * FROM families WHERE id = ?").get(invitation.family_id);
  res.json({ message: "Successfully joined household!", family });
});

// Create new Family
router.post("/", authenticate, (req: AuthenticatedRequest, res) => {
  const { name, description, capacity, homeAddress, homeLatitude, homeLongitude } = req.body;
  const user = req.user!;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Household name is required." });
  }

  const cap = Math.min(Math.max(parseInt(capacity, 10) || 8, 2), 50);

  const createTx = db.transaction(() => {
    const insertFamily = db.prepare(`
      INSERT INTO families (name, description, capacity, home_address, home_latitude, home_longitude, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertFamily.run(
      name.trim(),
      description || null,
      cap,
      homeAddress || null,
      homeLatitude || null,
      homeLongitude || null,
      user.id
    );

    const familyId = Number(result.lastInsertRowid);

    // Primary Admin role
    db.prepare(`
      INSERT INTO family_memberships (family_id, user_id, role, status)
      VALUES (?, ?, 'admin_primary', 'active')
    `).run(familyId, user.id);

    // Create default grocery list for the household
    db.prepare(`
      INSERT INTO grocery_lists (family_id, creator_user_id, title, is_private)
      VALUES (?, ?, 'Household Groceries', 0)
    `).run(familyId, user.id);

    // Initial location settings
    db.prepare(`
      INSERT INTO location_sharing_settings (family_id, user_id, enabled, precision)
      VALUES (?, ?, 0, 'approximate')
    `).run(familyId, user.id);

    logAudit(familyId, user.id, "FAMILY_CREATED", "family", familyId, { name: name.trim(), capacity: cap });

    return familyId;
  });

  const newFamilyId = createTx();
  const createdFamily = db.prepare("SELECT * FROM families WHERE id = ?").get(newFamilyId);

  res.status(201).json({
    family: createdFamily,
    role: "admin_primary",
  });
});

// Get single Family with members & user role
router.get("/:familyId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);

  const family = db.prepare("SELECT * FROM families WHERE id = ?").get(familyId) as any;
  const members = db.prepare(`
    SELECT fm.id as membership_id, fm.role, fm.status, fm.joined_at, fm.requested_role,
           u.id as user_id, u.email, u.name, u.avatar_url
    FROM family_memberships fm
    JOIN users u ON u.id = fm.user_id
    WHERE fm.family_id = ?
    ORDER BY CASE fm.role WHEN 'admin_primary' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END, fm.joined_at ASC
  `).all(familyId);

  res.json({
    family,
    members,
    currentRole: req.familyMembership!.role,
  });
});

// Update family settings
router.patch("/:familyId", authenticate, requireFamilyMember, requireRole(["admin_primary", "admin"]), (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { name, description, capacity, homeAddress, homeLatitude, homeLongitude, photoUrl } = req.body;

  if (name && typeof name === "string") {
    db.prepare("UPDATE families SET name = ? WHERE id = ?").run(name.trim(), familyId);
  }
  if (description !== undefined) {
    db.prepare("UPDATE families SET description = ? WHERE id = ?").run(description, familyId);
  }
  if (capacity !== undefined) {
    const cap = Math.min(Math.max(parseInt(capacity, 10) || 8, 2), 50);
    db.prepare("UPDATE families SET capacity = ? WHERE id = ?").run(cap, familyId);
  }
  if (homeAddress !== undefined) {
    db.prepare("UPDATE families SET home_address = ?, home_latitude = ?, home_longitude = ? WHERE id = ?")
      .run(homeAddress, homeLatitude || null, homeLongitude || null, familyId);
  }
  if (photoUrl !== undefined) {
    db.prepare("UPDATE families SET photo_url = ? WHERE id = ?").run(photoUrl, familyId);
  }

  db.prepare("UPDATE families SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(familyId);

  logAudit(familyId, req.user!.id, "FAMILY_UPDATED", "family", familyId, req.body);

  const updated = db.prepare("SELECT * FROM families WHERE id = ?").get(familyId);
  res.json({ family: updated });
});

// Create Invitation Link
router.post("/:familyId/invitations", authenticate, requireFamilyMember, requireRole(["admin_primary", "admin", "parent"]), (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { role = "member", maxUses = 5, expiresInDays = 7 } = req.body;

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (parseInt(expiresInDays, 10) || 7));

  const insert = db.prepare(`
    INSERT INTO invitations (family_id, token, created_by_user_id, role, max_uses, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(familyId, token, req.user!.id, role, parseInt(maxUses, 10) || 1, expiresAt.toISOString());
  logAudit(familyId, req.user!.id, "INVITATION_CREATED", "invitation", Number(result.lastInsertRowid), { role, maxUses });

  res.status(201).json({
    invitation: {
      id: result.lastInsertRowid,
      token,
      role,
      max_uses: maxUses,
      expires_at: expiresAt.toISOString(),
      invite_url: `/join/${token}`,
    },
  });
});

// List Invitations
router.get("/:familyId/invitations", authenticate, requireFamilyMember, requireRole(["admin_primary", "admin", "parent"]), (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);

  const invitations = db.prepare(`
    SELECT i.*, u.name as creator_name
    FROM invitations i
    JOIN users u ON u.id = i.created_by_user_id
    WHERE i.family_id = ?
    ORDER BY i.created_at DESC
  `).all(familyId);

  res.json({ invitations });
});

// Revoke invitation
router.delete("/:familyId/invitations/:invitationId", authenticate, requireFamilyMember, requireRole(["admin_primary", "admin"]), (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const invitationId = parseInt(req.params.invitationId, 10);

  db.prepare(`
    UPDATE invitations
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE id = ? AND family_id = ?
  `).run(invitationId, familyId);

  logAudit(familyId, req.user!.id, "INVITATION_REVOKED", "invitation", invitationId, null);
  res.json({ message: "Invitation successfully revoked." });
});

// Update Member Role (RBAC enforcement)
router.patch("/:familyId/members/:targetUserId/role", authenticate, requireFamilyMember, requireRole(["admin_primary", "admin"]), (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const targetUserId = parseInt(req.params.targetUserId, 10);
  const { newRole } = req.body;

  const validRoles = ["admin_primary", "admin", "parent", "spouse", "senior", "child", "caregiver", "member"];
  if (!validRoles.includes(newRole)) {
    return res.status(400).json({ error: "Invalid role specified." });
  }

  // A user cannot elevate their own role
  if (targetUserId === req.user!.id) {
    return res.status(403).json({ error: "You cannot modify your own role." });
  }

  const targetMember = db.prepare(`
    SELECT * FROM family_memberships WHERE family_id = ? AND user_id = ?
  `).get(familyId, targetUserId) as any;

  if (!targetMember) {
    return res.status(404).json({ error: "Member not found in this household." });
  }

  // Only admin_primary can transfer primary admin role or modify an admin_primary
  if (targetMember.role === "admin_primary" && req.familyMembership!.role !== "admin_primary") {
    return res.status(403).json({ error: "Only the Primary Administrator can modify primary administrator status." });
  }

  if (newRole === "admin_primary") {
    if (req.familyMembership!.role !== "admin_primary") {
      return res.status(403).json({ error: "Only the Primary Administrator can transfer primary ownership." });
    }

    // Transfer admin_primary: demote current user to admin, promote target to admin_primary
    const transferTx = db.transaction(() => {
      db.prepare("UPDATE family_memberships SET role = 'admin' WHERE family_id = ? AND user_id = ?").run(familyId, req.user!.id);
      db.prepare("UPDATE family_memberships SET role = 'admin_primary' WHERE family_id = ? AND user_id = ?").run(familyId, targetUserId);
    });
    transferTx();
  } else {
    db.prepare(`
      UPDATE family_memberships
      SET role = ?
      WHERE family_id = ? AND user_id = ?
    `).run(newRole, familyId, targetUserId);
  }

  logAudit(familyId, req.user!.id, "MEMBER_ROLE_CHANGED", "family_membership", targetUserId, {
    oldRole: targetMember.role,
    newRole,
  });

  res.json({ message: "Member role updated successfully.", newRole });
});

// Remove Member or leave family
router.delete("/:familyId/members/:targetUserId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const targetUserId = parseInt(req.params.targetUserId, 10);

  const isSelf = targetUserId === req.user!.id;
  const isAdmin = ["admin_primary", "admin"].includes(req.familyMembership!.role);

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: "Only administrators can remove other members." });
  }

  const targetMember = db.prepare(`
    SELECT * FROM family_memberships WHERE family_id = ? AND user_id = ?
  `).get(familyId, targetUserId) as any;

  if (!targetMember) {
    return res.status(404).json({ error: "Member not found." });
  }

  if (targetMember.role === "admin_primary") {
    return res.status(400).json({ error: "The Primary Administrator cannot be removed. Transfer primary admin role first." });
  }

  db.prepare("DELETE FROM family_memberships WHERE family_id = ? AND user_id = ?").run(familyId, targetUserId);

  logAudit(familyId, req.user!.id, isSelf ? "MEMBER_LEFT" : "MEMBER_REMOVED", "family_membership", targetUserId, null);
  res.json({ message: isSelf ? "You have left the household." : "Member has been removed." });
});

// Audit Log for Family
router.get("/:familyId/audit", authenticate, requireFamilyMember, requireRole(["admin_primary", "admin"]), (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);

  const logs = db.prepare(`
    SELECT a.*, u.name as actor_name, u.email as actor_email
    FROM audit_events a
    LEFT JOIN users u ON u.id = a.actor_user_id
    WHERE a.family_id = ?
    ORDER BY a.created_at DESC
    LIMIT 100
  `).all(familyId);

  res.json({ auditLogs: logs });
});

export default router;
