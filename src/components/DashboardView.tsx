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
  FileText,
  Building,
} from "lucide-react";
import { api } from "../api/client";
import { Family, ViewMode, FamilyMember } from "../types";

interface DashboardProps {
  family: Family;
  members: FamilyMember[];
  onNavigate: (view: ViewMode) => void;
  onOpenInvite?: () => void;
  onOpenQuickAdd?: (type: "task" | "grocery" | "event" | "medicine") => void;
}

const AVATAR_COLORS = [
  "#4F7BFF", // Blue (Me)
  "#E83F6F", // Pink (Wife)
  "#1FA971", // Green (Son)
  "#F59E0B", // Amber (Dad)
  "#7C3AED", // Purple (Daughter)
  "#EA580C", // Orange (Mom)
];

export const DashboardView: React.FC<DashboardProps> = ({
  family,
  members,
  onNavigate,
  onOpenInvite,
}) => {
  const [data, setData] = useState<any>(null);
  const [groceries, setGroceries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const [res, grocRes] = await Promise.all([
        api.getDashboardSummary(family.id),
        api.getGroceries(family.id),
      ]);
      setData(res);
      setGroceries(grocRes.items || []);
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

  const {
    todayEvents = [],
    pendingTasks = [],
    taskStats = { totalPending: 0, urgentCount: 0 },
    groceryStats = { total: 0, unchecked: 0 },
    upcomingMedicine = [],
    billStats = { unpaidCount: 0, totalAmount: 0 },
    activeSharers = [],
  } = data || {};

  // Formatted date
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const greetingName = members.length > 0 ? members[0].name.split(" ")[0] : "Alex";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 1. HERO ROW */}
      <div className="hero-row">
        <div className="desktop-hero-text">
          <div className="hero-date">{dateStr}</div>
          <h2 className="hero-headline">A good day starts together.</h2>
          <p className="hero-subline">Here's what's happening around your home today.</p>
        </div>

        <div className="mobile-hero-text">
          <h2 className="hero-headline">Good afternoon, {greetingName}!</h2>
          <p className="hero-subline">Here's your day at a glance.</p>
        </div>

        {/* Weather Glass Chip */}
        <div className="weather-chip">
          <Sun size={28} strokeWidth={1.8} color="#F59E0B" />
          <div>
            <div className="weather-temp">28°C</div>
            <div className="weather-desc">Partly cloudy</div>
          </div>
        </div>
      </div>

      {/* 2. FAMILY ROW (Two Cards) */}
      <div className="family-row-grid">
        {/* Card 1: Members Bubble Row */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="members-bubble-row">
            {members.length > 0 ? (
              members.map((m, idx) => (
                <div
                  key={m.user_id}
                  className="member-bubble-item"
                  onClick={() => onNavigate("Family")}
                >
                  <div
                    className="member-avatar-lg"
                    style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="member-bubble-name">
                    {m.name.split(" ")[0]}
                  </span>
                </div>
              ))
            ) : (
              <div className="member-bubble-item">
                <div className="member-avatar-lg" style={{ background: "#4F7BFF" }}>
                  M
                </div>
                <span className="member-bubble-name">Me</span>
              </div>
            )}

            {/* Invite Circle */}
            <div
              className="member-bubble-item"
              onClick={() => onNavigate("Family")}
              title="Invite member"
            >
              <div className="member-invite-circle">
                <Plus size={22} strokeWidth={1.8} />
              </div>
              <span className="member-bubble-name" style={{ color: "var(--muted)" }}>
                Invite
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Family Location Thumbnail */}
        <div
          className="glass-card"
          style={{ cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
          onClick={() => onNavigate("Map")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>Family Location</span>
            <span style={{ fontSize: "0.75rem", color: "var(--chip-task)", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1FA971" }} />
              All connected
            </span>
          </div>

          <div
            style={{
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(79,123,255,0.14) 0%, rgba(139,92,246,0.12) 100%)",
              border: "1px solid var(--glass-border)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              padding: "0 16px",
              marginTop: 6,
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#E83F6F", boxShadow: "0 2px 8px rgba(232,63,111,0.5)" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#1FA971", boxShadow: "0 2px 8px rgba(31,169,113,0.5)" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#4F7BFF", boxShadow: "0 2px 8px rgba(79,123,255,0.5)" }} />
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTIONS (Desktop Pills Row) */}
      <div className="quick-actions-row desktop-quick-actions">
        <button className="btn-primary-filled" onClick={() => onNavigate("Tasks")}>
          <Plus size={16} strokeWidth={2.2} />
          <span>Add to your day</span>
        </button>

        <button className="action-glass-pill" onClick={() => onNavigate("Tasks")}>
          <div className="chip-icon chip-task">
            <CheckSquare size={15} strokeWidth={1.8} />
          </div>
          <span>Add Task</span>
        </button>

        <button className="action-glass-pill" onClick={() => onNavigate("Groceries")}>
          <div className="chip-icon chip-grocery">
            <ShoppingBag size={15} strokeWidth={1.8} />
          </div>
          <span>Add Grocery</span>
        </button>

        <button className="action-glass-pill" onClick={() => onNavigate("Care")}>
          <div className="chip-icon chip-medicine">
            <HeartPulse size={15} strokeWidth={1.8} />
          </div>
          <span>Add Medicine</span>
        </button>

        <button className="action-glass-pill" onClick={() => onNavigate("Calendar")}>
          <div className="chip-icon chip-event">
            <Calendar size={15} strokeWidth={1.8} />
          </div>
          <span>Add Event</span>
        </button>

        <button className="action-glass-pill" onClick={() => onNavigate("Map")}>
          <div className="chip-icon chip-map">
            <MapPin size={15} strokeWidth={1.8} />
          </div>
          <span>Find Nearby</span>
        </button>
      </div>

      {/* 3b. QUICK ACTIONS (Mobile 4-tile grid) */}
      <div className="mobile-quick-actions-grid">
        <button className="mobile-action-tile" onClick={() => onNavigate("Tasks")}>
          <div className="mobile-action-tile-icon" style={{ background: "var(--chip-task-bg)", color: "var(--chip-task)" }}>
            <CheckSquare size={20} strokeWidth={1.8} />
          </div>
          <span className="mobile-action-tile-label">Task</span>
        </button>

        <button className="mobile-action-tile" onClick={() => onNavigate("Groceries")}>
          <div className="mobile-action-tile-icon" style={{ background: "var(--chip-grocery-bg)", color: "var(--chip-grocery)" }}>
            <ShoppingBag size={20} strokeWidth={1.8} />
          </div>
          <span className="mobile-action-tile-label">Grocery</span>
        </button>

        <button className="mobile-action-tile" onClick={() => onNavigate("Care")}>
          <div className="mobile-action-tile-icon" style={{ background: "var(--chip-medicine-bg)", color: "var(--chip-medicine)" }}>
            <HeartPulse size={20} strokeWidth={1.8} />
          </div>
          <span className="mobile-action-tile-label">Medicine</span>
        </button>

        <button className="mobile-action-tile" onClick={() => onNavigate("Map")}>
          <div className="mobile-action-tile-icon" style={{ background: "var(--chip-map-bg)", color: "var(--chip-map)" }}>
            <MapPin size={20} strokeWidth={1.8} />
          </div>
          <span className="mobile-action-tile-label">Nearby</span>
        </button>
      </div>

      {/* 4. SIX STAT TILES ROW */}
      <div className="stat-tiles-grid">
        {/* Events */}
        <div className="stat-tile" onClick={() => onNavigate("Calendar")}>
          <div className="stat-tile-top">
            <div className="chip-icon chip-event">
              <Calendar size={16} strokeWidth={1.8} />
            </div>
          </div>
          <div className="stat-tile-label">Today's Events</div>
          <div className="stat-tile-num">{todayEvents.length}</div>
          <div className="stat-tile-note">
            {todayEvents.length > 0
              ? `Next at ${new Date(todayEvents[0].starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "None scheduled"}
          </div>
        </div>

        {/* Tasks */}
        <div className="stat-tile" onClick={() => onNavigate("Tasks")}>
          <div className="stat-tile-top">
            <div className="chip-icon chip-task">
              <CheckSquare size={16} strokeWidth={1.8} />
            </div>
          </div>
          <div className="stat-tile-label">Tasks</div>
          <div className="stat-tile-num">{taskStats.totalPending}</div>
          <div className="stat-tile-note">{taskStats.totalPending} pending</div>
        </div>

        {/* Groceries */}
        <div className="stat-tile" onClick={() => onNavigate("Groceries")}>
          <div className="stat-tile-top">
            <div className="chip-icon chip-grocery">
              <ShoppingBag size={16} strokeWidth={1.8} />
            </div>
          </div>
          <div className="stat-tile-label">Grocery Items</div>
          <div className="stat-tile-num">{groceryStats.unchecked}</div>
          <div className="stat-tile-note">{groceryStats.unchecked} to buy</div>
        </div>

        {/* Medicine */}
        <div className="stat-tile" onClick={() => onNavigate("Care")}>
          <div className="stat-tile-top">
            <div className="chip-icon chip-medicine">
              <HeartPulse size={16} strokeWidth={1.8} />
            </div>
          </div>
          <div className="stat-tile-label">Medicine</div>
          <div className="stat-tile-num">{upcomingMedicine.length}</div>
          <div className="stat-tile-note">All on track</div>
        </div>

        {/* Bills Due */}
        <div className="stat-tile" onClick={() => onNavigate("Finance")}>
          <div className="stat-tile-top">
            <div className="chip-icon chip-bills">
              <CreditCard size={16} strokeWidth={1.8} />
            </div>
          </div>
          <div className="stat-tile-label">Bills Due</div>
          <div className="stat-tile-num">{billStats.unpaidCount}</div>
          <div className="stat-tile-note">Due this week</div>
        </div>

        {/* Family Check-in */}
        <div className="stat-tile" onClick={() => onNavigate("Map")}>
          <div className="stat-tile-top">
            <div className="chip-icon chip-map">
              <Users size={16} strokeWidth={1.8} />
            </div>
          </div>
          <div className="stat-tile-label">Family Check-in</div>
          <div className="stat-tile-num">All</div>
          <div className="stat-tile-note">Connected</div>
        </div>
      </div>

      {/* 5. THREE CONTENT PANELS ROW */}
      <div className="content-panels-grid">
        {/* Panel 1: Today's Schedule */}
        <div className="glass-card">
          <div className="panel-header">
            <span className="panel-title">Today's Schedule</span>
            <span className="panel-link" onClick={() => onNavigate("Calendar")}>
              Full calendar
            </span>
          </div>

          {todayEvents.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
              No events scheduled today
            </div>
          ) : (
            <div className="schedule-list">
              {todayEvents.map((evt: any) => (
                <div key={evt.id} className="schedule-row">
                  <span className="schedule-time">
                    {new Date(evt.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="chip-icon chip-event" style={{ width: 30, height: 30, borderRadius: 10 }}>
                    <Calendar size={15} strokeWidth={1.8} />
                  </div>
                  <div className="schedule-content">
                    <div className="schedule-item-title">{evt.title}</div>
                    <div className="schedule-item-sub">{evt.location_name || "Home"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel 2: Live Family Location */}
        <div className="glass-card">
          <div className="panel-header">
            <span className="panel-title">Live Family Location</span>
            <span className="panel-link" onClick={() => onNavigate("Map")}>
              View all
            </span>
          </div>

          <div className="mini-map-box">
            <div className="map-grid-pattern" />
            <div className="mini-map-pin" style={{ top: "35%", left: "40%", background: "#E83F6F" }} />
            <div className="mini-map-pin" style={{ top: "25%", left: "70%", background: "#4F7BFF" }} />
            <div className="mini-map-pin" style={{ top: "65%", left: "60%", background: "#1FA971" }} />
            <div className="map-home-chip">
              Home • {family.home_address ? family.home_address.split(",")[0] : "Family residence"}
            </div>
          </div>

          <div className="location-avatar-row">
            {members.slice(0, 4).map((m, idx) => (
              <div key={m.user_id} className="loc-avatar-col">
                <div
                  className="loc-avatar-circle"
                  style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="loc-name">{m.name.split(" ")[0]}</div>
                <div className="loc-status">{idx === 0 ? "Now" : `${idx * 5}m ago`}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 3: Grocery List */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="panel-header">
            <span className="panel-title">Grocery List</span>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>
              {groceries.length} items
            </span>
          </div>

          {groceries.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", flex: 1 }}>
              Grocery list is empty
            </div>
          ) : (
            <div className="grocery-list-col" style={{ flex: 1, marginBottom: 12 }}>
              {groceries.slice(0, 4).map((g) => (
                <div key={g.id} className="grocery-item-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      className={`checkbox-round ${g.checked === 1 ? "checked" : ""}`}
                      onClick={() => toggleGroceryCheck(g)}
                    >
                      {g.checked === 1 && <Check size={14} strokeWidth={2.4} />}
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        textDecoration: g.checked === 1 ? "line-through" : "none",
                        color: g.checked === 1 ? "var(--muted)" : "var(--text)",
                      }}
                    >
                      {g.name}
                    </span>
                  </div>
                  <span className="category-tag">{g.category}</span>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", borderRadius: 14 }}
            onClick={() => onNavigate("Groceries")}
          >
            Add item
          </button>
        </div>
      </div>
    </div>
  );
};
