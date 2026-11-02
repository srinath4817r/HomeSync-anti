import { Router } from "express";
import db from "../db/database";
import {
  authenticate,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Get current user notifications
router.get("/", authenticate, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(userId);

  const unreadCount = db.prepare(`
    SELECT count(1) as count FROM notifications
    WHERE user_id = ? AND read_at IS NULL
  `).get(userId) as any;

  res.json({
    notifications,
    unreadCount: unreadCount.count || 0,
  });
});

// Mark single notification as read
router.patch("/:id/read", authenticate, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const id = parseInt(req.params.id, 10);

  db.prepare(`
    UPDATE notifications
    SET read_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(id, userId);

  res.json({ message: "Notification marked as read." });
});

// Mark all as read
router.post("/read-all", authenticate, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  db.prepare(`
    UPDATE notifications
    SET read_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND read_at IS NULL
  `).run(userId);

  res.json({ message: "All notifications marked as read." });
});

export default router;
