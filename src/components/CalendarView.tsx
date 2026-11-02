import React, { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { api } from "../api/client";
import { Family, CalendarEvent, FamilyMember } from "../types";

interface CalendarProps {
  family: Family;
  members: FamilyMember[];
}

export const CalendarView: React.FC<CalendarProps> = ({ family, members }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [recurrenceRule, setRecurrenceRule] = useState("none");
  const [assignedToUserId, setAssignedToUserId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Window: 1 month before to 2 months after current date
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();
      const res = await api.getEvents(family.id, start, end);
      setEvents(res.events || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [family.id, currentDate.getMonth(), currentDate.getFullYear()]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      await api.createEvent(family.id, {
        title,
        description,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        locationName,
        priority,
        recurrenceRule,
        assignedToUserId: assignedToUserId ? parseInt(assignedToUserId, 10) : null,
        visibility: "family",
      });

      setShowModal(false);
      setTitle("");
      setDescription("");
      setLocationName("");
      fetchEvents();
    } catch (err: any) {
      alert(err.message || "Failed to save event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId: number | string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.deleteEvent(family.id, eventId);
      setEvents(events.filter((e) => e.id !== eventId));
    } catch (err: any) {
      alert(err.message || "Failed to delete event");
    }
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Controls Bar */}
      <div className="glass-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="icon-btn" onClick={handlePrev}>
              <ChevronLeft size={18} />
            </button>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, minWidth: 180 }}>
              {monthName}
            </h2>
            <button className="icon-btn" onClick={handleNext}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: 3, border: "var(--glass-border)" }}>
              {(["day", "week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: viewMode === mode ? "var(--accent-gradient)" : "transparent",
                    color: viewMode === mode ? "#fff" : "var(--text-secondary)",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                  onClick={() => setViewMode(mode)}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>

            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              <span>Add Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* Events List / Calendar Content */}
      <div className="glass-card">
        {loading ? (
          <div className="empty-state">
            <Clock className="empty-icon" />
            <div className="empty-title">Loading schedule...</div>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <CalendarIcon className="empty-icon" />
            <div className="empty-title">No events found for this timeframe</div>
            <div className="empty-subtitle">Use the "Add Event" button above to schedule doctor appointments, family activities, or school schedules.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {events.map((evt) => {
              const startDate = new Date(evt.starts_at);
              return (
                <div
                  key={evt.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 16,
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface)",
                    border: "var(--glass-border)",
                    transition: "var(--transition)",
                  }}
                >
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div
                      style={{
                        padding: "8px 14px",
                        borderRadius: "var(--radius-md)",
                        background: "rgba(124, 77, 255, 0.12)",
                        color: "var(--accent-primary)",
                        textAlign: "center",
                        minWidth: 70,
                      }}
                    >
                      <div style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                        {startDate.toLocaleString("default", { month: "short" }).toUpperCase()}
                      </div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>{startDate.getDate()}</div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem" }}>{evt.title}</div>
                      <div style={{ display: "flex", gap: 12, fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} />
                          {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {evt.location_name && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={12} />
                            {evt.location_name}
                          </span>
                        )}
                        {evt.recurrence_rule !== "none" && (
                          <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>
                            ↻ {evt.recurrence_rule}
                          </span>
                        )}
                      </div>
                      {evt.description && (
                        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 4 }}>
                          {evt.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: evt.priority === "urgent" ? "rgba(255,23,68,0.15)" : "rgba(124,77,255,0.12)",
                        color: evt.priority === "urgent" ? "var(--accent-rose)" : "var(--accent-primary)",
                      }}
                    >
                      {evt.priority.toUpperCase()}
                    </span>

                    <button
                      className="icon-btn"
                      onClick={() => handleDelete(evt.id)}
                      title="Delete event"
                    >
                      <Trash2 size={16} color="var(--accent-rose)" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>
              Schedule Calendar Event
            </h2>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Event Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g., Pediatrician Checkup"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Notes, preparation, or documents to bring"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Starts At *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ends At</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., City Medical Center"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Recurrence</label>
                  <select
                    className="form-select"
                    value={recurrenceRule}
                    onChange={(e) => setRecurrenceRule(e.target.value)}
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Member</label>
                  <select
                    className="form-select"
                    value={assignedToUserId}
                    onChange={(e) => setAssignedToUserId(e.target.value)}
                  >
                    <option value="">Whole Family</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
