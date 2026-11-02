import React, { useState } from "react";
import {
  Moon,
  Sun,
  Bell,
  LogOut,
  Search,
  Home,
  Check,
  Sparkles,
} from "lucide-react";
import { User, Family, NotificationItem } from "../types";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  user: User;
  activeFamily: Family | null;
  onLogout: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onSearch?: (query: string) => void;
  onOpenAi?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  user,
  activeFamily,
  onLogout,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onOpenAi,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="top-bar">
      {/* Mobile-only brand badge (visible only under 700px) */}
      <div className="mobile-only-brand">
        <div className="brand-icon-box" style={{ width: 36, height: 36, borderRadius: 12 }}>
          <Home size={18} strokeWidth={1.8} />
        </div>
        <span style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.02em" }}>HOME SYNC</span>
      </div>

      {/* Glass Search Pill (Desktop/Tablet) */}
      <div className="search-pill-container">
        <Search size={18} strokeWidth={1.8} className="search-icon-inside" />
        <input
          type="text"
          className="search-pill-input"
          placeholder="Search your home (tasks, groceries, members…)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Right Controls */}
      <div className="top-bar-actions">
        {/* AI Assistant Trigger */}
        {onOpenAi && (
          <button
            id="ai-assistant-btn"
            className="glass-icon-btn"
            onClick={onOpenAi}
            aria-label="AI Assistant"
            title="HomeSync AI Assistant"
          >
            <Sparkles size={19} strokeWidth={1.8} color="var(--accent)" />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          className="glass-icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          title={theme === "light" ? "Dark Mode" : "Light Mode"}
        >
          {theme === "light" ? <Moon size={19} strokeWidth={1.8} /> : <Sun size={19} strokeWidth={1.8} />}
        </button>

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            className="glass-icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={19} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 9,
                  right: 9,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#F0568C",
                  border: "2px solid #fff",
                }}
              />
            )}
          </button>

          {showNotifications && (
            <div
              className="modal-content notifications-dropdown"
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 12,
                width: 320,
                maxHeight: 380,
                padding: 18,
                zIndex: 300,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
                    onClick={onMarkAllRead}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
                  No new notifications.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: 10,
                        borderRadius: 14,
                        background: n.read_at ? "transparent" : "var(--glass-soft)",
                        border: "1px solid var(--glass-border-subtle)",
                        cursor: "pointer",
                      }}
                      onClick={() => onMarkRead(n.id)}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)" }}>{n.title}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>{n.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Chip */}
        <div style={{ position: "relative" }}>
          <div
            className="user-profile-chip"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            role="button"
            tabIndex={0}
            aria-label="User Profile"
          >
            <div className="user-avatar-circle">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-meta-info">
              <div className="user-meta-name">{user.name}</div>
              <div className="user-meta-role">
                {activeFamily?.role ? activeFamily.role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : "Family Admin"}
              </div>
            </div>
          </div>

          {showProfileMenu && (
            <div
              className="modal-content"
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                width: 180,
                padding: 10,
                zIndex: 300,
              }}
            >
              <button
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.85rem" }}
                onClick={onLogout}
              >
                <LogOut size={16} strokeWidth={1.8} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
