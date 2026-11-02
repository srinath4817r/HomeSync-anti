import React, { useEffect, useState } from "react";
import { Package, Plus, Trash2, Clock, AlertTriangle } from "lucide-react";
import { api } from "../api/client";
import { Family, InventoryItem } from "../types";

export const InventoryView: React.FC<{ family: Family }> = ({ family }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Pantry");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [storageLocation, setStorageLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.getInventory(family.id);
      setItems(res.items || []);
    } catch (err: any) {
      alert(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [family.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.createInventoryItem(family.id, {
        name: name.trim(),
        category,
        quantity: parseFloat(quantity) || 1,
        unit,
        storageLocation: storageLocation.trim() || null,
      });

      setItems([res.item, ...items]);
      setShowModal(false);
      setName("");
      setStorageLocation("");
    } catch (err: any) {
      alert(err.message || "Failed to save item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    try {
      await api.deleteInventoryItem(family.id, itemId);
      setItems(items.filter((i) => i.id !== itemId));
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="glass-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
            Household Inventory & Assets
          </h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      <div className="glass-card">
        {loading ? (
          <div className="empty-state">
            <Clock className="empty-icon" />
            <div className="empty-title">Loading inventory...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <Package className="empty-icon" />
            <div className="empty-title">No inventory tracked yet</div>
            <div className="empty-subtitle">Track tools, appliances, pantry stock, or medical supplies.</div>
          </div>
        ) : (
          <div className="grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 16,
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  border: "var(--glass-border)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{item.name}</div>
                    <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => handleDelete(item.id)}>
                      <Trash2 size={14} color="var(--accent-rose)" />
                    </button>
                  </div>

                  <div style={{ fontSize: "0.82rem", color: "var(--accent-primary)", fontWeight: 600, marginTop: 4 }}>
                    {item.quantity} {item.unit}
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6 }}>
                    Category: {item.category}
                    {item.storage_location ? ` • Location: ${item.storage_location}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>
              Add Inventory Asset
            </h2>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g., DeWalt Drill Set"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Tools">Tools & Equipment</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Pantry">Pantry & Storage</option>
                    <option value="Electronics">Electronics</option>
                    <option value="First Aid">First Aid / Medical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Storage Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Garage Workbench Shelf B"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
