import React, { useEffect, useState } from "react";
import {
  HeartPulse,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Bell,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { api } from "../api/client";
import { Family, CarePlan, MedicineOccurrence, FamilyMember } from "../types";

interface CareProps {
  family: Family;
  members: FamilyMember[];
}

export const CareView: React.FC<CareProps> = ({ family, members }) => {
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [occurrences, setOccurrences] = useState<MedicineOccurrence[]>([]);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [subjectUserId, setSubjectUserId] = useState<string>("");
  const [medicineName, setMedicineName] = useState("");
  const [dosageInfo, setDosageInfo] = useState("");
  const [prescribedInstructions, setPrescribedInstructions] = useState("");
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [startsOn, setStartsOn] = useState(new Date().toISOString().split("T")[0]);
  const [escalationAfterMinutes, setEscalationAfterMinutes] = useState("30");
  const [submitting, setSubmitting] = useState(false);

  const fetchCareData = async () => {
    try {
      setLoading(true);
      const res = await api.getCareOverview(family.id);
      setPlans(res.carePlans || []);
      setOccurrences(res.occurrences || []);
      setCaregivers(res.caregivers || []);
    } catch (err: any) {
      alert(err.message || "Failed to load care data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCareData();
  }, [family.id]);

  const handleAcknowledge = async (occId: number) => {
    try {
      await api.acknowledgeAlert(family.id, occId);
      setOccurrences(
        occurrences.map((o) =>
          o.id === occId ? { ...o, status: "acknowledged", alert_acknowledged_at: new Date().toISOString() } : o
        )
      );
    } catch (err: any) {
      alert(err.message || "Failed to acknowledge");
    }
  };

  const handleOutcome = async (occId: number, outcome: "taken" | "skipped" | "snoozed") => {
    try {
      await api.recordMedicineOutcome(family.id, occId, outcome);
      setOccurrences(
        occurrences.map((o) =>
          o.id === occId ? { ...o, status: outcome, outcome } : o
        )
      );
    } catch (err: any) {
      alert(err.message || "Failed to record outcome");
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName.trim() || !dosageInfo.trim()) return;

    try {
      setSubmitting(true);
      await api.createCarePlan(family.id, {
        subjectUserId: subjectUserId ? parseInt(subjectUserId, 10) : undefined,
        medicineName: medicineName.trim(),
        dosageInfo: dosageInfo.trim(),
        prescribedInstructions: prescribedInstructions.trim() || null,
        scheduledTimes: [scheduledTime],
        startsOn,
        escalationAfterMinutes: parseInt(escalationAfterMinutes, 10) || 30,
      });

      setShowModal(false);
      setMedicineName("");
      setDosageInfo("");
      setPrescribedInstructions("");
      fetchCareData();
    } catch (err: any) {
      alert(err.message || "Failed to create care plan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Action Bar */}
      <div className="glass-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
              Medicine Schedules & Care Plans
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              All dosages must be entered explicitly. AI is strictly prohibited from altering medical treatment plans.
            </p>
          </div>

          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Add Care Plan</span>
          </button>
        </div>
      </div>

      {/* Occurrences & Alerts Section */}
      <div className="glass-card">
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, marginBottom: 16 }}>
          Recent Medicine Doses & Alerts
        </h3>

        {loading ? (
          <div className="empty-state">
            <Clock className="empty-icon" />
            <div className="empty-title">Loading care occurrences...</div>
          </div>
        ) : occurrences.length === 0 ? (
          <div className="empty-state">
            <HeartPulse className="empty-icon" />
            <div className="empty-title">No scheduled medicine reminders right now</div>
            <div className="empty-subtitle">Create a care plan above for seniors, children, or personal prescriptions.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {occurrences.map((occ) => {
              const isEscalated = occ.status === "escalated";
              const isTaken = occ.status === "taken";
              const isAcknowledged = occ.status === "acknowledged";

              return (
                <div
                  key={occ.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    borderRadius: "var(--radius-md)",
                    background: isEscalated ? "rgba(255,23,68,0.08)" : "var(--bg-surface)",
                    border: isEscalated ? "1px solid rgba(255,23,68,0.3)" : "var(--glass-border)",
                  }}
                >
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div
                      style={{
                        padding: 10,
                        borderRadius: "var(--radius-md)",
                        background: isEscalated
                          ? "rgba(255,23,68,0.2)"
                          : isTaken
                          ? "rgba(0,200,83,0.15)"
                          : "rgba(124,77,255,0.12)",
                        color: isEscalated
                          ? "var(--accent-rose)"
                          : isTaken
                          ? "var(--accent-emerald)"
                          : "var(--accent-primary)",
                      }}
                    >
                      {isEscalated ? <AlertTriangle size={20} /> : <HeartPulse size={20} />}
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.98rem" }}>
                        {occ.medicine_name} — {occ.dosage_info}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                        For {occ.subject_name} • Scheduled: {new Date(occ.scheduled_for).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {isEscalated && (
                        <div style={{ fontSize: "0.78rem", color: "var(--accent-rose)", fontWeight: 600, marginTop: 4 }}>
                          ⚠️ Caregiver Escalation Active: Unacknowledged dose alert sent to designated caregivers!
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {!isTaken && (
                      <>
                        {!isAcknowledged && (
                          <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.82rem" }} onClick={() => handleAcknowledge(occ.id)}>
                            Acknowledge
                          </button>
                        )}
                        <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "0.82rem" }} onClick={() => handleOutcome(occ.id, "taken")}>
                          Mark Taken
                        </button>
                        <button className="btn btn-secondary" style={{ padding: "6px 10px", fontSize: "0.82rem" }} onClick={() => handleOutcome(occ.id, "snoozed")}>
                          Snooze
                        </button>
                      </>
                    )}
                    {isTaken && (
                      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent-emerald)", fontWeight: 700, fontSize: "0.85rem" }}>
                        <CheckCircle2 size={16} /> Taken
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Care Plans List */}
      <div className="glass-card">
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 700, marginBottom: 16 }}>
          Active Care Plans ({plans.length})
        </h3>

        {plans.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>No active recurring care plans configured.</div>
        ) : (
          <div className="grid-cols-2">
            {plans.map((p) => {
              const times = JSON.parse(p.scheduled_times || "[]");
              return (
                <div
                  key={p.id}
                  style={{
                    padding: 16,
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface)",
                    border: "var(--glass-border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem" }}>{p.medicine_name}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--accent-primary)", fontWeight: 600, marginTop: 2 }}>
                        {p.dosage_info}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius-pill)", background: "rgba(0,200,83,0.15)", color: "var(--accent-emerald)", fontWeight: 700 }}>
                      ACTIVE
                    </span>
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 8 }}>
                    Recipient: <strong>{p.subject_name}</strong>
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                    Daily Times: {times.join(", ")} • Escalation after {p.escalation_after_minutes} mins
                  </div>

                  {p.prescribed_instructions && (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                      Instructions: {p.prescribed_instructions}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Plan Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, marginBottom: 8 }}>
              Prescription Care Plan
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16 }}>
              Rule 10 strictly enforced: Enter human-verified dosage and schedule only.
            </p>

            <form onSubmit={handleCreatePlan}>
              <div className="form-group">
                <label className="form-label">Subject Member *</label>
                <select
                  className="form-select"
                  value={subjectUserId}
                  onChange={(e) => setSubjectUserId(e.target.value)}
                >
                  <option value="">Myself (Current User)</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Medication Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g., Amoxicillin"
                    value={medicineName}
                    onChange={(e) => setMedicineName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dosage Info *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g., 500mg capsule"
                    value={dosageInfo}
                    onChange={(e) => setDosageInfo(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Scheduled Time *</label>
                  <input
                    type="time"
                    className="form-input"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Escalate if Unacknowledged</label>
                  <select
                    className="form-select"
                    value={escalationAfterMinutes}
                    onChange={(e) => setEscalationAfterMinutes(e.target.value)}
                  >
                    <option value="15">After 15 minutes</option>
                    <option value="30">After 30 minutes</option>
                    <option value="60">After 1 hour</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Special Instructions</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Take with food and full glass of water"
                  value={prescribedInstructions}
                  onChange={(e) => setPrescribedInstructions(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Create Care Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
