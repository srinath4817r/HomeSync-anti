import React, { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  ShoppingBag,
  HeartPulse,
  MapPin,
  CreditCard,
  Package,
  FileText,
  HelpCircle,
  Users,
  Sparkles,
  Home,
  Plus,
  X,
} from "lucide-react";
import { ViewMode, Family } from "../types";

interface NavigationProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onOpenAi: () => void;
  activeFamily: Family | null;
  memberCount?: number;
}

export const navItems: { view: ViewMode; label: string; icon: React.ComponentType<any> }[] = [
  { view: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "Calendar", label: "Calendar", icon: Calendar },
  { view: "Tasks", label: "Tasks", icon: CheckSquare },
  { view: "Groceries", label: "Groceries", icon: ShoppingBag },
  { view: "Care", label: "Medicine & Care", icon: HeartPulse },
  { view: "Map", label: "Places & Map", icon: MapPin },
  { view: "Finance", label: "Bills & Finance", icon: CreditCard },
  { view: "Inventory", label: "Inventory", icon: Package },
  { view: "Documents", label: "Documents", icon: FileText },
  { view: "Requests", label: "Requests", icon: HelpCircle },
  { view: "Family", label: "Family Settings", icon: Users },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  onOpenAi,
  activeFamily,
  memberCount = 1,
}) => {
  const [showQuickSheet, setShowQuickSheet] = useState(false);

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon-box">
            <Home size={22} strokeWidth={1.8} />
          </div>
          <div className="brand-info">
            <span className="brand-title">HOME SYNC</span>
            <span className="brand-tagline">Living Digital Household</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => onSelectView(item.view)}
                aria-label={item.label}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          {activeFamily && (
            <div
              className="sidebar-family-chip"
              onClick={() => onSelectView("Family")}
              style={{ cursor: "pointer" }}
            >
              <div className="family-chip-avatar">
                {activeFamily.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div
                  className="family-chip-name"
                  style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {activeFamily.name}
                </div>
                <div className="family-chip-count">{memberCount} members synced</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Fixed Bottom Dock with Dimensional 3D Center Mark */}
      <nav className="mobile-glass-tab-bar" aria-label="Mobile Navigation">
        {/* Tab 1: Home */}
        <button
          className={`tab-bar-item ${currentView === "Dashboard" ? "active" : ""}`}
          onClick={() => {
            onSelectView("Dashboard");
            setShowQuickSheet(false);
          }}
          aria-label="Home"
        >
          <Home size={20} strokeWidth={currentView === "Dashboard" ? 2.2 : 1.8} />
          <span>Home</span>
        </button>

        {/* Tab 2: Calendar */}
        <button
          className={`tab-bar-item ${currentView === "Calendar" ? "active" : ""}`}
          onClick={() => {
            onSelectView("Calendar");
            setShowQuickSheet(false);
          }}
          aria-label="Schedule"
        >
          <Calendar size={20} strokeWidth={currentView === "Calendar" ? 2.2 : 1.8} />
          <span>Schedule</span>
        </button>

        {/* Central Dimensional 3D Action Mark */}
        <button
          className="mobile-central-3d-btn"
          onClick={() => setShowQuickSheet(!showQuickSheet)}
          aria-label="Household Action"
          title="Household Action"
        >
          {showQuickSheet ? (
            <X size={24} strokeWidth={2.4} />
          ) : (
            <div className="dimensional-home-icon">
              <Plus size={26} strokeWidth={2.4} />
            </div>
          )}
        </button>

        {/* Tab 3: Tasks */}
        <button
          className={`tab-bar-item ${currentView === "Tasks" ? "active" : ""}`}
          onClick={() => {
            onSelectView("Tasks");
            setShowQuickSheet(false);
          }}
          aria-label="Tasks"
        >
          <CheckSquare size={20} strokeWidth={currentView === "Tasks" ? 2.2 : 1.8} />
          <span>Tasks</span>
        </button>

        {/* Tab 4: Medicine & Care */}
        <button
          className={`tab-bar-item ${currentView === "Care" ? "active" : ""}`}
          onClick={() => {
            onSelectView("Care");
            setShowQuickSheet(false);
          }}
          aria-label="Care"
        >
          <HeartPulse size={20} strokeWidth={currentView === "Care" ? 2.2 : 1.8} />
          <span>Care</span>
        </button>
      </nav>

      {/* Mobile Quick Action Sheet */}
      {showQuickSheet && (
        <div
          style={{
            position: "fixed",
            bottom: "86px",
            left: "16px",
            right: "16px",
            maxWidth: "400px",
            margin: "0 auto",
            background: "var(--surface-card)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-card)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.25)",
            padding: "16px",
            zIndex: 1050,
            animation: "modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)", marginBottom: 12 }}>
            Quick Household Action
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            <button
              type="button"
              className="action-glass-pill"
              style={{ justifyContent: "flex-start", padding: "10px 12px" }}
              onClick={() => {
                onSelectView("Tasks");
                setShowQuickSheet(false);
              }}
            >
              <div className="chip-icon chip-task">
                <CheckSquare size={14} />
              </div>
              <span style={{ fontSize: "0.82rem" }}>New Chore</span>
            </button>

            <button
              type="button"
              className="action-glass-pill"
              style={{ justifyContent: "flex-start", padding: "10px 12px" }}
              onClick={() => {
                onSelectView("Groceries");
                setShowQuickSheet(false);
              }}
            >
              <div className="chip-icon chip-grocery">
                <ShoppingBag size={14} />
              </div>
              <span style={{ fontSize: "0.82rem" }}>Add Grocery</span>
            </button>

            <button
              type="button"
              className="action-glass-pill"
              style={{ justifyContent: "flex-start", padding: "10px 12px" }}
              onClick={() => {
                onSelectView("Care");
                setShowQuickSheet(false);
              }}
            >
              <div className="chip-icon chip-medicine">
                <HeartPulse size={14} />
              </div>
              <span style={{ fontSize: "0.82rem" }}>Log Dose</span>
            </button>

            <button
              type="button"
              className="action-glass-pill"
              style={{ justifyContent: "flex-start", padding: "10px 12px" }}
              onClick={() => {
                onOpenAi();
                setShowQuickSheet(false);
              }}
            >
              <div className="chip-icon" style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}>
                <Sparkles size={14} />
              </div>
              <span style={{ fontSize: "0.82rem" }}>AI Assistant</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
