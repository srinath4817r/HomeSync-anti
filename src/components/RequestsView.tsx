import React, { useEffect, useState } from "react";
import { HelpCircle, Plus, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import { Family, ServiceRequest, FamilyMember } from "../types";

export const RequestsView: React.FC<{ family: Family; members: FamilyMember[] }> = ({ family, members }) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Maintenance");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.getRequests(family.id);
      setRequests(res.requests || []);
    } catch (err: any) {
      alert(err.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [family.id]);

  const handleUpdateStatus = async (reqId: number, status: string) => {
    try {
      const res = await api.updateRequestStatus(family.id, reqId, status);
      setRequests(requests.map((r) => (r.id === reqId ? res.request : r)));
    } catch (err: any) {
      alert(err.message || "Failed to update request");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.createRequest(family.id, {
        title: title.trim(),
        category,
        description: description.trim(),
        priority,
        assignedToUserId: assignedToUserId ? parseInt(assignedToUserId, 10) : undefined,
      });

      setRequests([res.request, ...requests]);
      setShowModal(false);
      setTitle("");
      setDescription("");
    } catch (err: any) {
      alert(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="glass-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
              Household Assistance & Service Requests
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Submit, accept, and track help requests for maintenance, transport, childcare, and role corrections.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>New Request</span>
          </button>
        </div>
      </div>

      <div className="glass-card">
        {loading ? (
          <div className="empty-state">
            <Clock className="empty-icon" />
            <div className="empty-title">Loading service requests...</div>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <HelpCircle className="empty-icon" />
            <div className="empty-title">No service requests currently open</div>
            <div className="empty-subtitle">Need help with home repairs, grocery pickup, or schedule adjustments? Create a request.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {requests.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: "16px 20px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  border: "var(--glass-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem" }}>{r.title}</span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background:
                          r.status === "Completed"
                            ? "rgba(0,200,83,0.15)"
                            : r.status === "Accepted"
                            ? "rgba(0,176,255,0.15)"
                            : "rgba(124,77,255,0.12)",
                        color:
                          r.status === "Completed"
                            ? "var(--accent-emerald)"
                            : r.status === "Accepted"
                            ? "var(--accent-cyan)"
                            : "var(--accent-primary)",
                      }}
                    >
                      {r.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
                    {r.description}
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6 }}>
                    Category: {r.category} • Submitted by {r.creator_name}
                    {r.assignee_name ? ` • Assigned to: ${r.assignee_name}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {r.status === "Submitted" && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                      onClick={() => handleUpdateStatus(r.id, "Accepted")}
                    >
                      Accept Request
                    </button>
                  )}
                  {r.status === "Accepted" && (
                    <button
                      className="btn btn-primary"
                      style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                      onClick={() => handleUpdateStatus(r.id, "Completed")}
                    >
                      Mark Completed
                    </button>
                  )}
                  {r.status === "Completed" && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-emerald)", fontWeight: 700, fontSize: "0.85rem" }}>
                      <CheckCircle2 size={16} /> Completed
                    </span>
                  )}
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
              Submit Service Request
            </h2>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Request Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g., Plumber needed for kitchen faucet"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Maintenance">Maintenance & Repair</option>
                    <option value="Transport">Transport / School Run</option>
                    <option value="Childcare">Childcare / Babysitting</option>
                    <option value="Shopping">Shopping Assistance</option>
                    <option value="RoleCorrection">Role Correction Request</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Details *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  placeholder="Describe what needs to be done and when..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign To</label>
                <select
                  className="form-select"
                  value={assignedToUserId}
                  onChange={(e) => setAssignedToUserId(e.target.value)}
                >
                  <option value="">Open to Household</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
