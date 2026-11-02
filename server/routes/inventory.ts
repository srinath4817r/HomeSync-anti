import { Router } from "express";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();

// List inventory items
router.get("/:familyId/inventory", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { category } = req.query;

  let query = `
    SELECT i.*, o.name as owner_name
    FROM inventory_items i
    JOIN users o ON o.id = i.owner_user_id
    WHERE i.family_id = ?
  `;
  const params: any[] = [familyId];

  if (category && typeof category === "string") {
    query += ` AND i.category = ?`;
    params.push(category);
  }

  query += ` ORDER BY i.name ASC`;

  const items = db.prepare(query).all(...params);
  res.json({ items });
});

// Create inventory item
router.post("/:familyId/inventory", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const { name, category = "General", quantity = 1, unit = "pcs", reorderThreshold, storageLocation, warrantyExpiresOn } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Item name is required." });
  }

  const insert = db.prepare(`
    INSERT INTO inventory_items (family_id, owner_user_id, name, category, quantity, unit, reorder_threshold, storage_location, warranty_expires_on)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    familyId,
    req.user!.id,
    name.trim(),
    category,
    parseFloat(quantity) || 1,
    unit || "pcs",
    reorderThreshold ? parseFloat(reorderThreshold) : null,
    storageLocation || null,
    warrantyExpiresOn || null
  );

  const itemId = Number(result.lastInsertRowid);
  logAudit(familyId, req.user!.id, "INVENTORY_ITEM_CREATED", "inventory_item", itemId, { name: name.trim() });

  const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(itemId);
  res.status(201).json({ item });
});

// Update inventory item
router.patch("/:familyId/inventory/:itemId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const itemId = parseInt(req.params.itemId, 10);
  const { name, category, quantity, unit, reorderThreshold, storageLocation, warrantyExpiresOn } = req.body;

  const existing = db.prepare("SELECT * FROM inventory_items WHERE id = ? AND family_id = ?").get(itemId, familyId);
  if (!existing) {
    return res.status(404).json({ error: "Inventory item not found." });
  }

  db.prepare(`
    UPDATE inventory_items
    SET name = COALESCE(?, name),
        category = COALESCE(?, category),
        quantity = COALESCE(?, quantity),
        unit = COALESCE(?, unit),
        reorder_threshold = COALESCE(?, reorder_threshold),
        storage_location = COALESCE(?, storage_location),
        warranty_expires_on = COALESCE(?, warranty_expires_on),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name !== undefined ? name.trim() : null,
    category !== undefined ? category : null,
    quantity !== undefined ? parseFloat(quantity) : null,
    unit !== undefined ? unit : null,
    reorderThreshold !== undefined ? parseFloat(reorderThreshold) : null,
    storageLocation !== undefined ? storageLocation : null,
    warrantyExpiresOn !== undefined ? warrantyExpiresOn : null,
    itemId
  );

  const updated = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(itemId);
  res.json({ item: updated });
});

// Delete inventory item
router.delete("/:familyId/inventory/:itemId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const itemId = parseInt(req.params.itemId, 10);

  db.prepare("DELETE FROM inventory_items WHERE id = ? AND family_id = ?").run(itemId, familyId);
  res.json({ message: "Item deleted." });
});

export default router;
