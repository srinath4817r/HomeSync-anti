import React, { useEffect, useState } from "react";
import {
  CheckSquare,
  Plus,
  Clock,
  Trash2,
  CheckCircle2,
  Circle,
  User as UserIcon,
} from "lucide-react";
import { api } from "../api/client";
import { Family, Task, FamilyMember } from "../types";

interface TasksProps {
  family: Family;
  members: FamilyMember[];
}

export const TasksView: React.FC<TasksProps> = ({ family, members }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.getTasks(family.id, filterStatus === "all" ? undefined : filterStatus);
      setTasks(res.tasks || []);
    } catch (err: any) {
      alert(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [family.id, filterStatus]);

  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const res = await api.updateTask(family.id, task.id, { status: nextStatus });
      setTasks(tasks.map((t) => (t.id === task.id ? res.task : t)));
    } catch (err: any) {
      alert(err.message || "Failed to update task");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.createTask(family.id, {
        title: title.trim(),
        description: description.trim() || null,
        category,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assignedToUserId: assignedToUserId ? parseInt(assignedToUserId, 10) : null,
      });

      setTasks([res.task, ...tasks]);
      setShowModal(false);
      setTitle("");
      setDescription("");
      setDueDate("");
    } catch (err: any) {
      alert(err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.deleteTask(family.id, taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err: any) {
      alert(err.message || "Failed to delete task");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Action Bar */}
      <div className="glass-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "all", label: "All Tasks" },
              { id: "pending", label: "Pending" },
              { id: "completed", label: "Completed" },
            ].map((f) => (
              <button
                key={f.id}
                className={`btn ${filterStatus === f.id ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                onClick={() => setFilterStatus(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="glass-card">
        {loading ? (
          <div className="empty-state">
            <Clock className="empty-icon" />
            <div className="empty-title">Loading chores & tasks...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <CheckSquare className="empty-icon" />
            <div className="empty-title">No tasks in this view</div>
            <div className="empty-subtitle">Create household chores, errands, or maintenance tasks to keep everyone organized.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tasks.map((t) => {
              const isDone = t.status === "completed";
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    borderRadius: "var(--radius-md)",
                    background: isDone ? "rgba(0,0,0,0.02)" : "var(--bg-surface)",
                    border: "var(--glass-border)",
                    opacity: isDone ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: isDone ? "var(--accent-emerald)" : "var(--text-muted)",
                      }}
                      onClick={() => handleToggleStatus(t)}
                    >
                      {isDone ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                    </button>

                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {t.title}
                      </div>

                      <div style={{ display: "flex", gap: 12, fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 3 }}>
                        <span>Category: {t.category}</span>
                        {t.assignee_name && <span>Assigned: {t.assignee_name}</span>}
                        {t.due_date && <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>}
                      </div>

                      {t.description && (
                        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 4 }}>
                          {t.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "var(--radius-pill)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background:
                          t.priority === "urgent"
                            ? "rgba(255,23,68,0.15)"
                            : t.priority === "high"
                            ? "rgba(255,152,0,0.15)"
                            : "rgba(124,77,255,0.12)",
                        color:
                          t.priority === "urgent"
                            ? "var(--accent-rose)"
                            : t.priority === "high"
                            ? "#ff9800"
                            : "var(--accent-primary)",
                      }}
                    >
                      {t.priority.toUpperCase()}
                    </span>

                    <button
                      className="icon-btn"
                      onClick={() => handleDelete(t.id)}
                      title="Delete task"
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

      {/* Create Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>
              Create Household Task
            </h2>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g., Clean out the gutters"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Instructions</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Details, location in house, tools needed"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="General">General</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Errands">Errands</option>
                    <option value="Pets">Pets</option>
                    <option value="Yardwork">Yardwork</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
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
                  <label className="form-label">Assign To</label>
                  <select
                    className="form-select"
                    value={assignedToUserId}
                    onChange={(e) => setAssignedToUserId(e.target.value)}
                  >
                    <option value="">Anyone (Unassigned)</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name} ({m.role})
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
                  {submitting ? "Saving..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
