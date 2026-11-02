import { Router } from "express";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// Get groceries list with items grouped or filtered
router.get("/:familyId/groceries", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);

  // Retrieve or create household grocery list
  let list = db.prepare("SELECT * FROM grocery_lists WHERE family_id = ? AND is_private = 0 LIMIT 1").get(familyId) as any;
  if (!list) {
    const insert = db.prepare(`
      INSERT INTO grocery_lists (family_id, creator_user_id, title, is_private)
      VALUES (?, ?, 'Household Groceries', 0)
    `);
    const result = insert.run(familyId, req.user!.id);
    list = db.prepare("SELECT * FROM grocery_lists WHERE id = ?").get(result.lastInsertRowid);
  }

  const items = db.prepare(`
    SELECT gi.*, c.name as creator_name, cb.name as checked_by_name
    FROM grocery_items gi
    JOIN users c ON c.id = gi.creator_user_id
    LEFT JOIN users cb ON cb.id = gi.checked_by_user_id
    WHERE gi.family_id = ? AND gi.list_id = ?
    ORDER BY gi.checked ASC, gi.category ASC, gi.name ASC
  `).all(familyId, list.id);

  res.json({
    list,
    items,
  });
});

// Add grocery item
router.post("/:familyId/groceries", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { name, quantity = 1, unit = "pcs", category = "Produce", estimatedCost, listId } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Item name is required." });
  }

  // Find list
  let targetListId = listId;
  if (!targetListId) {
    const defaultList = db.prepare("SELECT id FROM grocery_lists WHERE family_id = ? AND is_private = 0 LIMIT 1").get(familyId) as any;
    targetListId = defaultList ? defaultList.id : null;
    if (!targetListId) {
      const created = db.prepare("INSERT INTO grocery_lists (family_id, creator_user_id, title) VALUES (?, ?, 'Household Groceries')").run(familyId, req.user!.id);
      targetListId = created.lastInsertRowid;
    }
  }

  const insert = db.prepare(`
    INSERT INTO grocery_items (list_id, family_id, creator_user_id, name, quantity, unit, category, estimated_cost, checked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  const result = insert.run(
    targetListId,
    familyId,
    req.user!.id,
    name.trim(),
    parseFloat(quantity) || 1,
    unit || "pcs",
    category || "Produce",
    estimatedCost ? parseFloat(estimatedCost) : null
  );

  const itemId = Number(result.lastInsertRowid);
  logAudit(familyId, req.user!.id, "GROCERY_ITEM_ADDED", "grocery_item", itemId, { name: name.trim() });

  const item = db.prepare(`
    SELECT gi.*, c.name as creator_name
    FROM grocery_items gi
    JOIN users c ON c.id = gi.creator_user_id
    WHERE gi.id = ?
  `).get(itemId);

  res.status(201).json({ item });
});

// Toggle check / update grocery item
router.patch("/:familyId/groceries/:itemId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const itemId = parseInt(req.params.itemId, 10);
  const { checked, quantity, unit, category, name, estimatedCost } = req.body;

  const existing = db.prepare("SELECT * FROM grocery_items WHERE id = ? AND family_id = ?").get(itemId, familyId) as any;
  if (!existing) {
    return res.status(404).json({ error: "Grocery item not found." });
  }

  let checkedVal = existing.checked;
  let checkedBy = existing.checked_by_user_id;
  let checkedAt = existing.checked_at;

  if (checked !== undefined) {
    checkedVal = checked ? 1 : 0;
    checkedBy = checked ? req.user!.id : null;
    checkedAt = checked ? new Date().toISOString() : null;
  }

  db.prepare(`
    UPDATE grocery_items
    SET name = COALESCE(?, name),
        quantity = COALESCE(?, quantity),
        unit = COALESCE(?, unit),
        category = COALESCE(?, category),
        estimated_cost = COALESCE(?, estimated_cost),
        checked = ?,
        checked_by_user_id = ?,
        checked_at = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name !== undefined ? name.trim() : null,
    quantity !== undefined ? parseFloat(quantity) : null,
    unit !== undefined ? unit : null,
    category !== undefined ? category : null,
    estimatedCost !== undefined ? parseFloat(estimatedCost) : null,
    checkedVal,
    checkedBy,
    checkedAt,
    itemId
  );

  const updated = db.prepare(`
    SELECT gi.*, c.name as creator_name, cb.name as checked_by_name
    FROM grocery_items gi
    JOIN users c ON c.id = gi.creator_user_id
    LEFT JOIN users cb ON cb.id = gi.checked_by_user_id
    WHERE gi.id = ?
  `).get(itemId);

  res.json({ item: updated });
});

// Delete grocery item
router.delete("/:familyId/groceries/:itemId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const itemId = parseInt(req.params.itemId, 10);

  const existing = db.prepare("SELECT * FROM grocery_items WHERE id = ? AND family_id = ?").get(itemId, familyId) as any;
  if (!existing) {
    return res.status(404).json({ error: "Grocery item not found." });
  }

  db.prepare("DELETE FROM grocery_items WHERE id = ?").run(itemId);
  res.json({ message: "Grocery item removed." });
});

// Clear all checked items
router.post("/:familyId/groceries/clear-checked", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);

  const result = db.prepare("DELETE FROM grocery_items WHERE family_id = ? AND checked = 1").run(familyId);
  logAudit(familyId, req.user!.id, "GROCERIES_CHECKED_CLEARED", "grocery_items", null, { count: result.changes });

  res.json({ message: "Cleared checked items.", count: result.changes });
});

export default router;
