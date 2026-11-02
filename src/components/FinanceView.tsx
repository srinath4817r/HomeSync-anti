import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api/client";
import { Family, Bill, FamilyMember } from "../types";

interface FinanceProps {
  family: Family;
  members: FamilyMember[];
}

export const FinanceView: React.FC<FinanceProps> = ({ family, members }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Utilities");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState("monthly");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await api.getBills(family.id);
      setBills(res.bills || []);
    } catch (err: any) {
      alert(err.message || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [family.id]);

  const handleMarkPaid = async (billId: number) => {
    try {
      const res = await api.markBillPaid(family.id, billId, false);
      setBills(bills.map((b) => (b.id === billId ? res.bill : b)));
    } catch (err: any) {
      alert(err.message || "Failed to mark paid");
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    try {
      setSubmitting(true);
      const res = await api.createBill(family.id, {
        title: title.trim(),
        amount: parseFloat(amount),
        category,
        dueDate: dueDate || null,
        recurrence,
        responsibleUserId: responsibleUserId ? parseInt(responsibleUserId, 10) : undefined,
      });

      setBills([res.bill, ...bills]);
      setShowModal(false);
      setTitle("");
      setAmount("");
      setDueDate("");
    } catch (err: any) {
      alert(err.message || "Failed to save bill");
    } finally {
      setSubmitting(false);
    }
  };

  const unpaidBills = bills.filter((b) => b.status === "unpaid");
  const paidBills = bills.filter((b) => b.status === "paid");
  const totalUnpaid = unpaidBills.reduce((acc, b) => acc + (b.amount || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Overview Stats */}
      <div className="grid-cols-3">
        <div className="glass-card">
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL UNPAID</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, margin: "6px 0", color: "var(--accent-rose)" }}>
            ${totalUnpaid.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{unpaidBills.length} bills pending payment</div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>PAID THIS PERIOD</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, margin: "6px 0", color: "var(--accent-emerald)" }}>
            {paidBills.length}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Settled household expenses</div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button className="btn btn-primary" style={{ width: "100%", height: 50 }} onClick={() => setShowModal(true)}>
            <Plus size={18} />
            <span>Add Household Bill</span>
          </button>
        </div>
      </div>

      {/* Bills List */}
      <div className="glass-card">
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}>
          All Household Bills
        </h3>

        {loading ? (
          <div className="empty-state">
            <Clock className="empty-icon" />
            <div className="empty-title">Loading household bills...</div>
          </div>
        ) : bills.length === 0 ? (
          <div className="empty-state">
            <CreditCard className="empty-icon" />
            <div className="empty-title">No bills or expenses logged yet</div>
            <div className="empty-subtitle">Track rent, electricity, water, internet, and insurance.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bills.map((bill) => {
              const isPaid = bill.status === "paid";
              return (
                <div
                  key={bill.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    borderRadius: "var(--radius-md)",
                    background: isPaid ? "rgba(0,0,0,0.02)" : "var(--bg-surface)",
                    border: "var(--glass-border)",
                    opacity: isPaid ? 0.7 : 1,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{bill.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {bill.category} • Recurrence: {bill.recurrence}
                      {bill.due_date ? ` • Due: ${new Date(bill.due_date).toLocaleDateString()}` : ""}
                      {bill.responsible_name ? ` • Assigned to ${bill.responsible_name}` : ""}
                    </div>
                    {isPaid && (
                      <div style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", fontWeight: 600, marginTop: 4 }}>
                        Paid on {new Date(bill.paid_at!).toLocaleDateString()}
                        {bill.marked_paid_by_name ? ` by ${bill.marked_paid_by_name}` : ""}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 700 }}>
                      ${bill.amount.toFixed(2)}
                    </div>

                    {!isPaid ? (
                      <button className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: "0.82rem" }} onClick={() => handleMarkPaid(bill.id)}>
                        Mark Paid
                      </button>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent-emerald)", fontWeight: 700, fontSize: "0.85rem" }}>
                        <CheckCircle2 size={16} /> Paid
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Bill Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>
              Add Household Bill
            </h2>

            <form onSubmit={handleCreateBill}>
              <div className="form-group">
                <label className="form-label">Bill Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g., High-speed Fiber Internet"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    required
                    placeholder="79.99"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Utilities">Utilities (Power, Water, Gas)</option>
                    <option value="Internet">Internet / Cable</option>
                    <option value="Rent/Mortgage">Rent / Mortgage</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Medical">Medical / Pharmacy</option>
                  </select>
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Recurrence</label>
                  <select className="form-select" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                    <option value="monthly">Monthly</option>
                    <option value="one-time">One-time</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Responsible Member</label>
                <select
                  className="form-select"
                  value={responsibleUserId}
                  onChange={(e) => setResponsibleUserId(e.target.value)}
                >
                  <option value="">Whole Household</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
