import { Router } from "express";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Get bills
router.get("/:familyId/bills", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { status } = req.query;

  let query = `
    SELECT b.*, o.name as owner_name, r.name as responsible_name, m.name as marked_paid_by_name
    FROM bills b
    JOIN users o ON o.id = b.owner_user_id
    LEFT JOIN users r ON r.id = b.responsible_user_id
    LEFT JOIN users m ON m.id = b.marked_paid_by
    WHERE b.family_id = ?
  `;
  const params: any[] = [familyId];

  if (status && typeof status === "string") {
    query += ` AND b.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY b.status ASC, b.due_date ASC`;

  const bills = db.prepare(query).all(...params);
  res.json({ bills });
});

// Create bill
router.post("/:familyId/bills", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { title, category = "Utilities", amount, currency = "USD", dueDate, recurrence = "monthly", responsibleUserId } = req.body;

  if (!title || amount === undefined || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: "Title and a valid amount are required." });
  }

  const insert = db.prepare(`
    INSERT INTO bills (family_id, owner_user_id, responsible_user_id, title, category, amount, currency, due_date, recurrence, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')
  `);

  const result = insert.run(
    familyId,
    req.user!.id,
    responsibleUserId ? parseInt(responsibleUserId, 10) : null,
    title.trim(),
    category,
    parseFloat(amount),
    currency || "USD",
    dueDate || null,
    recurrence
  );

  const billId = Number(result.lastInsertRowid);
  logAudit(familyId, req.user!.id, "BILL_CREATED", "bill", billId, { title, amount });

  const bill = db.prepare(`
    SELECT b.*, o.name as owner_name, r.name as responsible_name
    FROM bills b
    JOIN users o ON o.id = b.owner_user_id
    LEFT JOIN users r ON r.id = b.responsible_user_id
    WHERE b.id = ?
  `).get(billId);

  res.status(201).json({ bill });
});

// Mark bill as paid (distinguishes user marked vs verified)
router.post("/:familyId/bills/:billId/mark-paid", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const billId = parseInt(req.params.billId, 10);
  const { verified = false } = req.body;

  const bill = db.prepare("SELECT * FROM bills WHERE id = ? AND family_id = ?").get(billId, familyId) as any;
  if (!bill) {
    return res.status(404).json({ error: "Bill not found." });
  }

  db.prepare(`
    UPDATE bills
    SET status = 'paid',
        paid_at = CURRENT_TIMESTAMP,
        marked_paid_by = ?,
        payment_verified = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.user!.id, verified ? 1 : 0, billId);

  logAudit(familyId, req.user!.id, "BILL_PAID", "bill", billId, { verified });

  const updated = db.prepare(`
    SELECT b.*, o.name as owner_name, r.name as responsible_name, m.name as marked_paid_by_name
    FROM bills b
    JOIN users o ON o.id = b.owner_user_id
    LEFT JOIN users r ON r.id = b.responsible_user_id
    LEFT JOIN users m ON m.id = b.marked_paid_by
    WHERE b.id = ?
  `).get(billId);

  res.json({ bill: updated });
});

export default router;
