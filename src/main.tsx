import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api } from "./api/client";
import { User, Family, ViewMode, FamilyMember, NotificationItem } from "./types";
import { Navigation } from "./components/Navigation";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { CalendarView } from "./components/CalendarView";
import { TasksView } from "./components/TasksView";
import { GroceriesView } from "./components/GroceriesView";
import { CareView } from "./components/CareView";
import { MapView } from "./components/MapView";
import { FinanceView } from "./components/FinanceView";
import { InventoryView } from "./components/InventoryView";
import { DocumentsView } from "./components/DocumentsView";
import { RequestsView } from "./components/RequestsView";
import { FamilyView } from "./components/FamilyView";
import { AiModal } from "./components/AiModal";
import { AuthScreen } from "./components/AuthScreen";
import { Plus, Shield, Clock } from "lucide-react";
import "./styles.css";

const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("homesync_theme") as "light" | "dark") || "dark";
  });

  // Auth & Household state
  const [user, setUser] = useState<User | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>("Dashboard");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAiModal, setShowAiModal] = useState(false);
  const [showCreateFamilyModal, setShowCreateFamilyModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Create Family Form
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyCapacity, setNewFamilyCapacity] = useState("8");
  const [newFamilyAddress, setNewFamilyAddress] = useState("");
  const [creatingFamily, setCreatingFamily] = useState(false);

  // Join invitation token in URL path e.g. /join/:token
  const [joinToken, setJoinToken] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/join\/([^/]+)\/?$/);
    return match ? match[1] : null;
  });
  const [joinPreview, setJoinPreview] = useState<any>(null);

  // Apply theme to HTML root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("homesync_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Initial user session verification
  const checkSession = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      setFamilies(res.families || []);
      if (res.families && res.families.length > 0) {
        setActiveFamily(res.families[0]);
      }
    } catch {
      setUser(null);
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Fetch family members & notifications whenever activeFamily changes
  useEffect(() => {
    if (!activeFamily) {
      setMembers([]);
      return;
    }

    api.getFamily(activeFamily.id).then((res) => {
      setMembers(res.members || []);
    });

    api.getNotifications().then((res) => {
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    });

    // Poll notifications every 30 seconds
    const interval = setInterval(() => {
      api.getNotifications().then((res) => {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [activeFamily?.id]);

  // Check invitation preview if join token is in URL
  useEffect(() => {
    if (joinToken) {
      api
        .previewInvitation(joinToken)
        .then((preview) => {
          setJoinPreview(preview);
        })
        .catch((err) => {
          alert("Invalid invitation link: " + err.message);
          setJoinToken(null);
        });
    }
  }, [joinToken]);

  const handleJoinInvitation = async () => {
    if (!joinToken) return;
    try {
      const res = await api.joinFamily(joinToken);
      alert("Welcome to " + (res.family?.name || "your new household") + "!");
      window.history.pushState({}, "", "/");
      setJoinToken(null);
      checkSession();
    } catch (err: any) {
      alert("Failed to join household: " + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setFamilies([]);
      setActiveFamily(null);
      setCurrentView("Dashboard");
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;

    try {
      setCreatingFamily(true);
      const res = await api.createFamily({
        name: newFamilyName.trim(),
        capacity: parseInt(newFamilyCapacity, 10) || 8,
        homeAddress: newFamilyAddress.trim() || null,
      });

      const updatedFamilies = [...families, res.family];
      setFamilies(updatedFamilies);
      setActiveFamily(res.family);
      setShowCreateFamilyModal(false);
      setNewFamilyName("");
      setNewFamilyAddress("");
    } catch (err: any) {
      alert(err.message || "Failed to create household");
    } finally {
      setCreatingFamily(false);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(
        notifications.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <Clock className="empty-icon" />
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem" }}>
          Initializing HomeSync...
        </div>
      </div>
    );
  }

  // If not logged in, render real Auth Screen
  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={(authenticatedUser) => {
          setUser(authenticatedUser);
          checkSession();
        }}
      />
    );
  }

  // If user has no households, prompt to create their first household
  if (families.length === 0 || !activeFamily) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div className="glass-card" style={{ maxWidth: 520, width: "100%", padding: 36 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div className="brand-icon" style={{ width: 48, height: 48, margin: "0 auto 16px" }}>
              <Shield size={24} />
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800 }}>
              Welcome, {user.name}!
            </h1>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: 6 }}>
              You are signed in with verified account <strong>{user.email}</strong>. Create your household to start syncing schedules, medicine, and chores.
            </p>
          </div>

          <form onSubmit={handleCreateFamily}>
            <div className="form-group">
              <label className="form-label">Household Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g., The Miller Family"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Home Address (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., 742 Evergreen Terrace, Springfield"
                value={newFamilyAddress}
                onChange={(e) => setNewFamilyAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Household Capacity</label>
              <select
                className="form-select"
                value={newFamilyCapacity}
                onChange={(e) => setNewFamilyCapacity(e.target.value)}
              >
                <option value="4">Up to 4 members</option>
                <option value="8">Up to 8 members (Standard)</option>
                <option value="16">Up to 16 members (Extended)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", height: 48, marginTop: 12 }}
              disabled={creatingFamily || !newFamilyName.trim()}
            >
              <Plus size={18} />
              <span>{creatingFamily ? "Creating..." : "Create My Household"}</span>
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.82rem", cursor: "pointer" }}
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Navigation
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        onOpenAi={() => setShowAiModal(true)}
        activeFamily={activeFamily}
        memberCount={members.length}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          user={user}
          activeFamily={activeFamily}
          onLogout={handleLogout}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onOpenAi={() => setShowAiModal(true)}
        />

        <main className="page-container" style={{ minWidth: 0 }}>
          <div key={currentView} className="view-transition-wrapper">
            {currentView === "Dashboard" && (
              <DashboardView
                family={activeFamily}
                members={members}
                onNavigate={(v) => setCurrentView(v)}
              />
            )}

            {currentView === "Calendar" && (
              <CalendarView family={activeFamily} members={members} />
            )}

            {currentView === "Tasks" && (
              <TasksView family={activeFamily} members={members} />
            )}

            {currentView === "Groceries" && (
              <GroceriesView family={activeFamily} />
            )}

            {currentView === "Care" && (
              <CareView family={activeFamily} members={members} />
            )}

            {currentView === "Map" && (
              <MapView family={activeFamily} />
            )}

            {currentView === "Finance" && (
              <FinanceView family={activeFamily} members={members} />
            )}

            {currentView === "Inventory" && (
              <InventoryView family={activeFamily} />
            )}

            {currentView === "Documents" && (
              <DocumentsView family={activeFamily} />
            )}

            {currentView === "Requests" && (
              <RequestsView family={activeFamily} members={members} />
            )}

            {currentView === "Family" && (
              <FamilyView family={activeFamily} currentUserId={user.id} />
            )}
          </div>
        </main>
      </div>

      {/* AI Assistant Modal */}
      <AiModal
        family={activeFamily}
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onRefreshData={() => {
          // Re-trigger view reload if needed
        }}
      />

      {/* Join Invitation Modal (if url has /join/:token) */}
      {joinPreview && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: "center" }}>
            <div className="brand-icon" style={{ width: 44, height: 44, margin: "0 auto 12px" }}>
              <Shield size={20} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 700 }}>
              Household Invitation
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: 8 }}>
              <strong>{joinPreview.inviterName}</strong> invited you to join the{" "}
              <strong>{joinPreview.familyName}</strong> household as a{" "}
              <strong>{joinPreview.suggestedRole}</strong>.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setJoinPreview(null);
                  window.history.pushState({}, "", "/");
                }}
              >
                Decline
              </button>
              <button className="btn btn-primary" onClick={handleJoinInvitation}>
                Accept & Join Household
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Household Modal */}
      {showCreateFamilyModal && (
        <div className="modal-overlay" onClick={() => setShowCreateFamilyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>
              Create New Household
            </h2>

            <form onSubmit={handleCreateFamily}>
              <div className="form-group">
                <label className="form-label">Household Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g., Vacation Home or Grandparents"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Home Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., 100 Main St, Suite 4B"
                  value={newFamilyAddress}
                  onChange={(e) => setNewFamilyAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Member Capacity</label>
                <select
                  className="form-select"
                  value={newFamilyCapacity}
                  onChange={(e) => setNewFamilyCapacity(e.target.value)}
                >
                  <option value="4">Up to 4 members</option>
                  <option value="8">Up to 8 members</option>
                  <option value="16">Up to 16 members</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateFamilyModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingFamily || !newFamilyName.trim()}
                >
                  {creatingFamily ? "Creating..." : "Create Household"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
