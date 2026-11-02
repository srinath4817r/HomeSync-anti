import React, { useEffect, useState } from "react";
import {
  ShoppingBag,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
} from "lucide-react";
import { api } from "../api/client";
import { Family, GroceryItem } from "../types";

interface GroceriesProps {
  family: Family;
}

export const GroceriesView: React.FC<GroceriesProps> = ({ family }) => {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [category, setCategory] = useState("Produce");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchGroceries = async () => {
    try {
      setLoading(true);
      const res = await api.getGroceries(family.id);
      setItems(res.items || []);
    } catch (err: any) {
      alert(err.message || "Failed to load groceries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroceries();
  }, [family.id]);

  const handleToggleCheck = async (item: GroceryItem) => {
    const nextChecked = item.checked === 1 ? false : true;
    try {
      const res = await api.updateGroceryItem(family.id, item.id, { checked: nextChecked });
      setItems(items.map((i) => (i.id === item.id ? res.item : i)));
    } catch (err: any) {
      alert(err.message || "Failed to update item");
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.addGroceryItem(family.id, {
        name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit,
        category,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
      });

      setItems([res.item, ...items]);
      setShowModal(false);
      setName("");
      setQuantity("1");
      setEstimatedCost("");
    } catch (err: any) {
      alert(err.message || "Failed to add grocery item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    try {
      await api.deleteGroceryItem(family.id, itemId);
      setItems(items.filter((i) => i.id !== itemId));
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  const handleClearChecked = async () => {
    if (!confirm("Remove all checked off items from the grocery list?")) return;
    try {
      await api.clearCheckedGroceries(family.id);
      setItems(items.filter((i) => i.checked === 0));
    } catch (err: any) {
      alert(err.message || "Failed to clear checked items");
    }
  };

  const uncheckedItems = items.filter((i) => i.checked === 0);
  const checkedItems = items.filter((i) => i.checked === 1);

  // Group by category
  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Bar */}
      <div className="glass-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>LIST PROGRESS</span>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 2 }}>
              {uncheckedItems.length} items to buy • {checkedItems.length} in cart
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {checkedItems.length > 0 && (
              <button className="btn btn-secondary" onClick={handleClearChecked}>
                Clear In-Cart ({checkedItems.length})
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              <span>Add Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Groceries Checklist */}
      <div className="glass-card">
        {loading ? (
          <div className="empty-state">
            <Clock className="empty-icon" />
            <div className="empty-title">Loading shared grocery list...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag className="empty-icon" />
            <div className="empty-title">Grocery list is currently empty</div>
            <div className="empty-subtitle">Add produce, pantry items, or toiletries for your household.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item) => {
              const isChecked = item.checked === 1;
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    background: isChecked ? "rgba(0,0,0,0.02)" : "var(--bg-surface)",
                    border: "var(--glass-border)",
                    opacity: isChecked ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: isChecked ? "var(--accent-emerald)" : "var(--text-muted)",
                      }}
                      onClick={() => handleToggleCheck(item)}
                    >
                      {isChecked ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                    </button>

                    <div>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          textDecoration: isChecked ? "line-through" : "none",
                        }}
                      >
                        {item.name}
                      </span>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginLeft: 8 }}>
                        ({item.quantity} {item.unit})
                      </span>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                        {item.category} {item.estimated_cost ? `• ~$${item.estimated_cost.toFixed(2)}` : ""}
                      </div>
                    </div>
                  </div>

                  <button
                    className="icon-btn"
                    onClick={() => handleDelete(item.id)}
                    title="Remove item"
                  >
                    <Trash2 size={16} color="var(--accent-rose)" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>
              Add Grocery Item
            </h2>

            <form onSubmit={handleAddItem}>
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g., Organic Eggs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                    <option value="pcs">pieces (pcs)</option>
                    <option value="carton">carton</option>
                    <option value="box">box</option>
                    <option value="bottle">bottle</option>
                    <option value="bag">bag</option>
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                    <option value="liters">liters</option>
                  </select>
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Produce">Produce / Fruits & Veggies</option>
                    <option value="Dairy & Eggs">Dairy & Eggs</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Meat & Seafood">Meat & Seafood</option>
                    <option value="Pantry">Pantry & Dry Goods</option>
                    <option value="Frozen">Frozen Foods</option>
                    <option value="Household">Household & Cleaning</option>
                    <option value="Personal Care">Personal Care</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Optional"
                    className="form-input"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Adding..." : "Add to List"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
