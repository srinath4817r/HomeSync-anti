import React from "react";
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
  return (
    <>
      {/* Desktop & Tablet Sidebar (232px wide glass card with 28px radius) */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon-box">
            <Home size={22} strokeWidth={1.8} />
          </div>
          <div className="brand-info">
            <span className="brand-title">HOME SYNC</span>
            <span className="brand-tagline">One Home. One Family.</span>
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
            <div className="sidebar-family-chip" onClick={() => onSelectView("Family")} style={{ cursor: "pointer" }}>
              <div className="family-chip-avatar">
                {activeFamily.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div className="family-chip-name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {activeFamily.name}
                </div>
                <div className="family-chip-count">{memberCount} members</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Floating Glass Mobile Bottom Tab Bar (14px from edges, 68px tall, 24px radius) */}
      <nav className="mobile-glass-tab-bar" aria-label="Mobile Navigation">
        <button
          className={`tab-bar-item ${currentView === "Dashboard" ? "active" : ""}`}
          onClick={() => onSelectView("Dashboard")}
          aria-label="Home"
        >
          <Home size={20} strokeWidth={1.8} />
          <span>Home</span>
        </button>

        <button
          className={`tab-bar-item ${currentView === "Calendar" ? "active" : ""}`}
          onClick={() => onSelectView("Calendar")}
          aria-label="Calendar"
        >
          <Calendar size={20} strokeWidth={1.8} />
          <span>Calendar</span>
        </button>

        <button
          className={`tab-bar-item ${currentView === "Map" ? "active" : ""}`}
          onClick={() => onSelectView("Map")}
          aria-label="Map"
        >
          <MapPin size={20} strokeWidth={1.8} />
          <span>Map</span>
        </button>

        <button
          className={`tab-bar-item ${currentView === "Family" ? "active" : ""}`}
          onClick={() => onSelectView("Family")}
          aria-label="Family"
        >
          <Users size={20} strokeWidth={1.8} />
          <span>Family</span>
        </button>

        <button
          className="tab-bar-item"
          onClick={onOpenAi}
          aria-label="AI Assistant"
        >
          <Sparkles size={20} strokeWidth={1.8} />
          <span>AI</span>
        </button>
      </nav>
    </>
  );
};
