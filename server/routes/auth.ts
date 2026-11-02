import { Router, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  createSession,
  revokeSession,
  SESSION_COOKIE_NAME,
  AuthenticatedRequest,
} from "../middleware/auth";

dotenv.config();

const router = Router();

function getGoogleAuth() {
  dotenv.config();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId) return null;
  return {
    clientId,
    secret,
    client: new OAuth2Client(clientId, secret),
  };
}

function setSessionCookie(res: Response, token: string) {
  const isSecure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: (process.env.COOKIE_SAME_SITE as "lax" | "strict" | "none") || "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

// Check auth configuration status
router.get("/config", (_req, res) => {
  const auth = getGoogleAuth();
  res.json({
    googleConfigured: Boolean(auth),
    googleClientId: auth ? auth.clientId : null,
    environment: process.env.NODE_ENV || "development",
  });
});

// Real Google OAuth verification
router.post("/google", async (req, res) => {
  const { credential } = req.body;
  const auth = getGoogleAuth();

  if (!auth) {
    return res.status(503).json({
      error: "Google OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.",
      configured: false,
    });
  }

  if (!credential || typeof credential !== "string") {
    return res.status(400).json({ error: "Missing or invalid Google credential token." });
  }

  try {
    const ticket = await auth.client.verifyIdToken({
      idToken: credential,
      audience: auth.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: "Invalid Google credential payload." });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split("@")[0];
    const googleId = payload.sub;
    const avatarUrl = payload.picture || null;

    let user = db.prepare("SELECT * FROM users WHERE google_id = ? OR email = ?").get(googleId, email) as any;

    if (!user) {
      const insert = db.prepare(`
        INSERT INTO users (google_id, email, name, avatar_url)
        VALUES (?, ?, ?, ?)
      `);
      const result = insert.run(googleId, email, name, avatarUrl);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid) as any;
      logAudit(null, user.id, "USER_REGISTERED_GOOGLE", "user", user.id, { email, name });
    } else {
      db.prepare(`
        UPDATE users
        SET name = ?, avatar_url = COALESCE(?, avatar_url), google_id = COALESCE(?, google_id), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, avatarUrl, googleId, user.id);
      logAudit(null, user.id, "USER_LOGIN_GOOGLE", "user", user.id, { email });
    }

    const sessionToken = createSession(user.id);
    setSessionCookie(res, sessionToken);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
      token: sessionToken,
    });
  } catch (err: any) {
    console.error("Google Auth verification failed:", err);
    return res.status(401).json({ error: "Failed to verify Google token: " + err.message });
  }
});

// Development / Testing login endpoint (strictly disabled in production)
router.post("/dev-login", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Dev login is disabled in production." });
  }

  const { email, name } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const displayName = (name && typeof name === "string" ? name.trim() : "") || cleanEmail.split("@")[0];

  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail) as any;

  if (!user) {
    const insert = db.prepare(`
      INSERT INTO users (email, name, avatar_url)
      VALUES (?, ?, ?)
    `);
    const result = insert.run(cleanEmail, displayName, null);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid) as any;
    logAudit(null, user.id, "USER_REGISTERED_DEV", "user", user.id, { email: cleanEmail });
  }

  const sessionToken = createSession(user.id);
  setSessionCookie(res, sessionToken);

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    },
    token: sessionToken,
  });
});

// Current authenticated user profile and memberships
router.get("/me", authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;

  const families = db.prepare(`
    SELECT f.id, f.name, f.description, f.photo_url, f.capacity, f.home_address,
           fm.role, fm.status, fm.joined_at,
           (SELECT count(1) FROM family_memberships WHERE family_id = f.id AND status = 'active') as member_count
    FROM family_memberships fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = ?
    ORDER BY fm.joined_at ASC
  `).all(user.id);

  res.json({
    user,
    families,
  });
});

// Logout and session invalidation
router.post("/logout", (req: AuthenticatedRequest, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers["x-session-token"];
  if (token && typeof token === "string") {
    revokeSession(token);
  }
  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ message: "Successfully signed out." });
});

// Update Profile
router.patch("/profile", authenticate, (req: AuthenticatedRequest, res) => {
  const { name, avatar_url } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Name is required." });
  }

  db.prepare(`
    UPDATE users
    SET name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name.trim(), avatar_url || null, req.user!.id);

  const updated = db.prepare("SELECT id, email, name, avatar_url FROM users WHERE id = ?").get(req.user!.id);
  res.json({ user: updated });
});

// Delete account & export data
router.delete("/account", authenticate, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  
  // Clean up sessions and user cascade
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  res.clearCookie(SESSION_COOKIE_NAME);

  res.json({ message: "Account and associated data deleted successfully." });
});

export default router;
