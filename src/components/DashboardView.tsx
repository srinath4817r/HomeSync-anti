import React, { useEffect, useState } from "react";
import {
  Calendar,
  CheckSquare,
  ShoppingBag,
  HeartPulse,
  CreditCard,
  MapPin,
  Clock,
  ArrowRight,
  Sun,
  Plus,
  Users,
  Compass,
  Check,
  CheckCircle2,
  AlertCircle,
  FileText,
  Shield,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { api } from "../api/client";
import { Family, ViewMode, FamilyMember } from "../types";
import { LivingHomeStage } from "./LivingHomeStage";
import { DayTimeline } from "./DayTimeline";
import { use3DCardTilt } from "./use3DCardTilt";

interface DashboardProps {
  family: Family;
  members: FamilyMember[];
  onNavigate: (view: ViewMode) => void;
  onOpenInvite?: () => void;
  onOpenQuickAdd?: (type: "task" | "grocery" | "event" | "medicine") => void;
}

export const DashboardView: React.FC<DashboardProps> = ({
  family,
  members,
  onNavigate,
  onOpenInvite,
}) => {
  const [data, setData] = useState<any>(null);
  const [groceries, setGroceries] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickGroceryName, setQuickGroceryName] = useState("");
  const [addingGrocery, setAddingGrocery] = useState(false);

  // 3D Card Hover hooks for physical depth
  const taskCardRef = use3DCardTilt<HTMLDivElement>();
  const careCardRef = use3DCardTilt<HTMLDivElement>();
  const groceryCardRef = use3DCardTilt<HTMLDivElement>();
  const financeCardRef = use3DCardTilt<HTMLDivElement>();

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const [res, grocRes, taskRes] = await Promise.all([
        api.getDashboardSummary(family.id),
        api.getGroceries(family.id),
        api.getTasks(family.id),
      ]);
      setData(res);
      setGroceries(grocRes.items || []);
      setTasks(taskRes.tasks || []);
    } catch (err: any) {
      console.warn("Summary load issue:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [family.id]);

  const toggleGroceryCheck = async (item: any) => {
    try {
      const nextChecked = item.checked === 1 ? false : true;
      const res = await api.updateGroceryItem(family.id, item.id, { checked: nextChecked });
      setGroceries(groceries.map((g) => (g.id === item.id ? res.item : g)));
    } catch (err: any) {
      alert(err.message || "Failed to update item");
    }
  };

  const handleToggleTask = async (task: any) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const res = await api.updateTask(family.id, task.id, { status: nextStatus });
      setTasks(tasks.map((t) => (t.id === task.id ? res.task : t)));
    } catch (err: any) {
      alert(err.message || "Failed to update task");
    }
  };

  const handleQuickAddGrocery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGroceryName.trim()) return;

    try {
      setAddingGrocery(true);
      const res = await api.createGroceryItem(family.id, {
        name: quickGroceryName.trim(),
        quantity: 1,
        unit: "pcs",
        category: "Produce",
      });
      setGroceries([res.item, ...groceries]);
      setQuickGroceryName("");
    } catch (err: any) {
      alert(err.message || "Failed to add grocery item");
    } finally {
      setAddingGrocery(false);
    }
  };

  const {
    todayEvents = [],
    pendingTasks = [],
    taskStats = { totalPending: 0, urgentCount: 0 },
    groceryStats = { total: 0, unchecked: 0 },
    upcomingMedicine = [],
    billStats = { unpaidCount: 0, totalAmount: 0 },
  } = data || {};

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const greetingName = members.length > 0 ? members[0].name.split(" ")[0] : "Alex";

  // Task statistics
  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;
  const totalTasksCount = Math.max(tasks.length, 1);
  const taskProgressPercent = Math.round((completedTasksCount / totalTasksCount) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0, width: "100%" }}>
      {/* 1. HERO ROW: Warm Architectural Greeting & Live Hearth Status */}
      <div className="hero-row">
        <div className="desktop-hero-text">
          <div className="hero-date">{dateStr}</div>
          <h2 className="hero-headline">A good day starts together.</h2>
          <p className="hero-subline">
            Welcome home to <strong>{family.name}</strong> • Living household presence active
          </p>
        </div>

        <div className="mobile-hero-text">
          <h2 className="hero-headline">Good day, {greetingName}!</h2>
          <p className="hero-subline">{family.name} • Household active</p>
        </div>

        {/* Weather Chip */}
        <div className="weather-chip">
          <Sun size={26} strokeWidth={1.8} color="#F59E0B" />
          <div>
            <div className="weather-temp">28°C</div>
            <div className="weather-desc">Partly cloudy</div>
          </div>
        </div>
      </div>

      {/* 2. CENTRAL LIVING HOME EXPERIENCE: 3D Family Avatars & Spatial Stage */}
      <LivingHomeStage
        family={family}
        members={members}
        onNavigate={onNavigate}
        activeTasks={tasks}
        activeMeds={upcomingMedicine}
      />

      {/* 3. INTELLIGENT QUICK ACTIONS: Structured, Tactile & Non-Repetitive */}
      <div
        className="quick-actions-row desktop-quick-actions"
        style={{
          padding: "2px 0",
          display: "flex",
          alignItems: "center",
          gap: 10,
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          className="btn-primary-filled"
          onClick={() => onNavigate("Tasks")}
        >
          <Plus size={16} strokeWidth={2.2} />
          <span>Add to Household</span>
        </button>

        <button
          type="button"
          className="action-glass-pill"
          onClick={() => onNavigate("Tasks")}
        >
          <div className="chip-icon chip-task">
            <CheckSquare size={14} strokeWidth={1.8} />
          </div>
          <span>New Chore</span>
        </button>

        <button
          type="button"
          className="action-glass-pill"
          onClick={() => onNavigate("Groceries")}
        >
          <div className="chip-icon chip-grocery">
            <ShoppingBag size={14} strokeWidth={1.8} />
          </div>
          <span>Add Grocery</span>
        </button>

        <button
          type="button"
          className="action-glass-pill"
          onClick={() => onNavigate("Care")}
        >
          <div className="chip-icon chip-medicine">
            <HeartPulse size={14} strokeWidth={1.8} />
          </div>
          <span>Log Medicine</span>
        </button>

        <button
          type="button"
          className="action-glass-pill"
          onClick={() => onNavigate("Calendar")}
        >
          <div className="chip-icon chip-event">
            <Calendar size={14} strokeWidth={1.8} />
          </div>
          <span>Schedule Event</span>
        </button>

        <button
          type="button"
          className="action-glass-pill"
          onClick={() => onNavigate("Finance")}
        >
          <div className="chip-icon chip-bills">
            <CreditCard size={14} strokeWidth={1.8} />
          </div>
          <span>Add Bill</span>
        </button>
      </div>

      {/* 4. BALANCED MIDDLE ROW: Today's Timeline + Care & Medicine Urgent Focus */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 16,
        }}
        className="family-row-grid"
      >
        {/* Left: Interactive Day Timeline */}
        <DayTimeline
          events={todayEvents}
          onNavigateCalendar={() => onNavigate("Calendar")}
        />

        {/* Right: Medicine & Care Urgent Focus Card (3D Tilt) */}
        <div
          ref={careCardRef}
          className="glass-card"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "var(--surface-card)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div>
            <div className="panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="chip-icon chip-medicine">
                  <HeartPulse size={15} />
                </div>
                <span className="panel-title">Medicine & Care Coordination</span>
              </div>
              <span className="panel-link" onClick={() => onNavigate("Care")}>
                Care plans
              </span>
            </div>

            {upcomingMedicine.length === 0 ? (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-subtle)",
                  marginTop: 6,
                }}
              >
                <div style={{ color: "var(--chip-task)", fontWeight: 700, fontSize: "0.86rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <CheckCircle2 size={16} />
                  <span>All Scheduled Doses Confirmed</span>
                </div>
                <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 4 }}>
                  No pending medication occurrences requiring escalation right now.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {upcomingMedicine.slice(0, 2).map((med: any) => (
                  <div
                    key={med.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--chip-medicine-border)",
                      background: "var(--chip-medicine-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--chip-medicine)" }}>
                        {med.medicine_name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text)", marginTop: 2 }}>
                        {med.prescribed_instructions || "1 tablet with water"}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={11} />
                        <span>Scheduled for {new Date(med.scheduled_for).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: "0.78rem", padding: "6px 12px", background: "var(--chip-medicine)" }}
                      onClick={() => onNavigate("Care")}
                    >
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              paddingTop: 12,
              marginTop: 12,
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Shield size={13} color="var(--chip-task)" />
              <span>Caregiver escalation active</span>
            </span>
            <span style={{ fontWeight: 700, color: "var(--text)" }}>
              {members.length} Guardians synced
            </span>
          </div>
        </div>
      </div>

      {/* 5. DIVERSE COMPOSITION SHELVES: Tasks Progress, Groceries Pantry, Household Finance */}
      <div className="content-panels-grid">
        {/* Panel 1: Chores & Tasks Attention-Now Hub (3D Tilt) */}
        <div
          ref={taskCardRef}
          className="glass-card"
          style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <div className="panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="chip-icon chip-task">
                  <CheckSquare size={15} />
                </div>
                <span className="panel-title">Chores & Tasks</span>
              </div>
              <span className="panel-link" onClick={() => onNavigate("Tasks")}>
                View all ({tasks.length})
              </span>
            </div>

            {/* Task Completion Progress Bar */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", fontWeight: 700, marginBottom: 4 }}>
                <span style={{ color: "var(--text-muted)" }}>Household Completion</span>
                <span style={{ color: "var(--chip-task)" }}>{taskProgressPercent}% done</span>
              </div>
              <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--surface-subtle)" }}>
                <div
                  style={{
                    width: `${taskProgressPercent}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: "var(--chip-task)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* Tasks list */}
            {tasks.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                All household chores are complete!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tasks.slice(0, 3).map((t) => {
                  const isDone = t.status === "completed";
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--surface-subtle)",
                        border: "1px solid var(--border-subtle)",
                        transition: "all 0.18s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <button
                          type="button"
                          className={`checkbox-round ${isDone ? "checked" : ""}`}
                          onClick={() => handleToggleTask(t)}
                          aria-label={isDone ? "Mark pending" : "Mark completed"}
                        >
                          {isDone && <Check size={12} strokeWidth={3} />}
                        </button>
                        <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span
                            style={{
                              fontSize: "0.84rem",
                              fontWeight: 600,
                              color: isDone ? "var(--text-muted)" : "var(--text)",
                              textDecoration: isDone ? "line-through" : "none",
                            }}
                          >
                            {t.title}
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: t.priority === "urgent" ? "var(--chip-medicine-bg)" : "var(--surface-hover)",
                          color: t.priority === "urgent" ? "var(--chip-medicine)" : "var(--text-muted)",
                          fontWeight: 700,
                        }}
                      >
                        {t.priority}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-outline"
            style={{ width: "100%", fontSize: "0.8rem", padding: "7px 12px", marginTop: 14 }}
            onClick={() => onNavigate("Tasks")}
          >
            <Plus size={13} />
            <span>Add New Chore</span>
          </button>
        </div>

        {/* Panel 2: Groceries Pantry Shelf (3D Tilt) */}
        <div
          ref={groceryCardRef}
          className="glass-card"
          style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <div className="panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="chip-icon chip-grocery">
                  <ShoppingBag size={15} />
                </div>
                <span className="panel-title">Shared Groceries</span>
              </div>
              <span className="panel-link" onClick={() => onNavigate("Groceries")}>
                Full list ({groceries.length})
              </span>
            </div>

            {/* Quick Inline Add Form */}
            <form onSubmit={handleQuickAddGrocery} style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Quick add (e.g. Oat milk, Bread)..."
                value={quickGroceryName}
                onChange={(e) => setQuickGroceryName(e.target.value)}
                className="form-input"
                style={{ fontSize: "0.82rem", padding: "6px 10px" }}
              />
              <button
                type="submit"
                disabled={addingGrocery || !quickGroceryName.trim()}
                className="btn btn-primary"
                style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              >
                Add
              </button>
            </form>

            {/* Groceries item list */}
            {groceries.length === 0 ? (
              <div style={{ padding: "16px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                Pantry is fully stocked!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {groceries.slice(0, 3).map((g) => {
                  const isChecked = g.checked === 1;
                  return (
                    <div
                      key={g.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "7px 10px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--surface-subtle)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          type="button"
                          className={`checkbox-round ${isChecked ? "checked" : ""}`}
                          onClick={() => toggleGroceryCheck(g)}
                          aria-label={isChecked ? "Uncheck grocery" : "Check grocery"}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </button>
                        <span
                          style={{
                            fontSize: "0.84rem",
                            fontWeight: 600,
                            color: isChecked ? "var(--text-muted)" : "var(--text)",
                            textDecoration: isChecked ? "line-through" : "none",
                          }}
                        >
                          {g.name}
                        </span>
                      </div>

                      <span className="category-tag">{g.category || "Pantry"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              paddingTop: 10,
              marginTop: 12,
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.74rem",
              color: "var(--text-muted)",
            }}
          >
            <span>{groceries.filter((g) => g.checked === 0).length} needed</span>
            <span style={{ fontWeight: 700, color: "var(--chip-grocery)" }}>
              {groceries.filter((g) => g.checked === 1).length} in cart
            </span>
          </div>
        </div>

        {/* Panel 3: Household Finances & Shared Bills (3D Tilt) */}
        <div
          ref={financeCardRef}
          className="glass-card"
          style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <div className="panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="chip-icon chip-bills">
                  <CreditCard size={15} />
                </div>
                <span className="panel-title">Household Bills</span>
              </div>
              <span className="panel-link" onClick={() => onNavigate("Finance")}>
                Ledger
              </span>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-subtle)",
                textAlign: "center",
                margin: "4px 0 12px",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Unpaid Shared Bills
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                ${billStats.totalAmount ? Number(billStats.totalAmount).toLocaleString() : "0"}
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--chip-bills)", fontWeight: 600, marginTop: 4 }}>
                {billStats.unpaidCount || 0} bills pending this month
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Next Due:</span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>Rent & Utilities • 1st of month</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Equal Split:</span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>Active across {members.length} adults</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline"
            style={{ width: "100%", fontSize: "0.8rem", padding: "7px 12px", marginTop: 14 }}
            onClick={() => onNavigate("Finance")}
          >
            <CreditCard size={13} />
            <span>Review & Settle Expenses</span>
          </button>
        </div>
      </div>
    </div>
  );
};
