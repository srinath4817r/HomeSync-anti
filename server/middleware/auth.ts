import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import db from "../db/database";

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  google_id: string | null;
}

export interface AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: AuthenticatedUser;
  familyMembership?: {
    family_id: number;
    role: string;
    status: string;
  };
}

export const SESSION_COOKIE_NAME = "homesync_session";

export function createSession(userId: number, daysValid = 30): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysValid);

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `);
  stmt.run(token, userId, expiresAt.toISOString());
  return token;
}

export function revokeSession(token: string): void {
  const stmt = db.prepare(`DELETE FROM sessions WHERE id = ?`);
  stmt.run(token);
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers["x-session-token"];

  if (!token || typeof token !== "string") {
    return res.status(401).json({ error: "Unauthorized. Authentication required." });
  }

  const session = db.prepare(`
    SELECT s.id, s.user_id, s.expires_at, u.id as u_id, u.email, u.name, u.avatar_url, u.google_id
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).get(token) as any;

  if (!session) {
    res.clearCookie(SESSION_COOKIE_NAME);
    return res.status(401).json({ error: "Session invalid or expired." });
  }

  if (new Date(session.expires_at) < new Date()) {
    revokeSession(token);
    res.clearCookie(SESSION_COOKIE_NAME);
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }

  req.user = {
    id: session.u_id,
    email: session.email,
    name: session.name,
    avatar_url: session.avatar_url,
    google_id: session.google_id,
  };

  next();
}

export function requireFamilyMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const familyId = parseInt(req.params.familyId || (req.body && req.body.familyId) || (req.query && (req.query.familyId as string)), 10);
  
  if (!familyId || isNaN(familyId)) {
    return res.status(400).json({ error: "Valid Family ID is required." });
  }

  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const membership = db.prepare(`
    SELECT family_id, role, status
    FROM family_memberships
    WHERE family_id = ? AND user_id = ?
  `).get(familyId, req.user.id) as any;

  if (!membership) {
    return res.status(403).json({ error: "You are not a member of this household." });
  }

  if (membership.status !== "active") {
    return res.status(403).json({ error: "Your membership is pending approval or suspended." });
  }

  req.familyMembership = membership;
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.familyMembership) {
      return res.status(403).json({ error: "Household membership context required." });
    }

    if (!allowedRoles.includes(req.familyMembership.role)) {
      return res.status(403).json({
        error: `Action requires one of the following roles: ${allowedRoles.join(", ")}. Current role: ${req.familyMembership.role}`,
      });
    }

    next();
  };
}
