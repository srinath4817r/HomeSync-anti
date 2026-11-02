import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Shield,
  Key,
  Trash2,
  Copy,
  Check,
  Clock,
  History,
  AlertCircle,
} from "lucide-react";
import { api } from "../api/client";
import { Family, FamilyMember, Invitation, Role } from "../types";

interface FamilyProps {
  family: Family;
  currentUserId: number;
}

export const FamilyView: React.FC<FamilyProps> = ({ family, currentUserId }) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("member");
  const [activeTab, setActiveTab] = useState<"members" | "invites" | "audit">("members");
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<Role>("member");
  const [maxUses, setMaxUses] = useState("5");
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isAdmin = ["admin_primary", "admin"].includes(currentRole);

  const fetchFamilyDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getFamily(family.id);
      setMembers(res.members || []);
      setCurrentRole(res.currentRole || "member");

      if (["admin_primary", "admin", "parent"].includes(res.currentRole)) {
        const invRes = await api.getInvitations(family.id);
        setInvitations(invRes.invitations || []);
      }

      if (["admin_primary", "admin"].includes(res.currentRole)) {
        const auditRes = await api.getAuditLog(family.id);
        setAuditLogs(auditRes.auditLogs || []);
      }
    } catch (err: any) {
      alert(err.message || "Failed to load household details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyDetails();
  }, [family.id]);

  const handleRoleChange = async (targetUserId: number, newRole: string) => {
    try {
      await api.updateMemberRole(family.id, targetUserId, newRole);
      setMembers(
        members.map((m) => (m.user_id === targetUserId ? { ...m, role: newRole as Role } : m))
      );
    } catch (err: any) {
      alert(err.message || "Failed to change role");
    }
  };

  const handleRemoveMember = async (targetUserId: number) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await api.removeMember(family.id, targetUserId);
      setMembers(members.filter((m) => m.user_id !== targetUserId));
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createInvitation(family.id, {
        role: inviteRole,
        maxUses: parseInt(maxUses, 10) || 5,
        expiresInDays: parseInt(expiresInDays, 10) || 7,
      });

      const fullUrl = `${window.location.origin}/join/${res.invitation.token}`;
      setGeneratedLink(fullUrl);
      setInvitations([res.invitation, ...invitations]);
    } catch (err: any) {
      alert(err.message || "Failed to generate invite link");
    }
  };

  const handleRevokeInvite = async (invId: number) => {
    try {
      await api.revokeInvitation(family.id, invId);
      setInvitations(
        invitations.map((i) => (i.id === invId ? { ...i, revoked_at: new Date().toISOString() } : i))
      );
    } catch (err: any) {
      alert(err.message || "Failed to revoke invitation");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header Info */}
      <div className="glass-card" style={{ padding: "18px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", fontWeight: 700 }}>
              {family.name}
            </h2>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 2 }}>
              Capacity: {members.length} / {family.capacity} members • Your Role: <strong>{currentRole}</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn ${activeTab === "members" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              onClick={() => setActiveTab("members")}
            >
              Members ({members.length})
            </button>
            <button
              className={`btn ${activeTab === "invites" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              onClick={() => setActiveTab("invites")}
            >
              Invitations
            </button>
            {isAdmin && (
              <button
                className={`btn ${activeTab === "audit" ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                onClick={() => setActiveTab("audit")}
              >
                Audit Log
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab: Members */}
      {activeTab === "members" && (
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700 }}>
              Household Members
            </h3>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
                <Plus size={16} />
                <span>Invite New Member</span>
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {members.map((m) => {
              const isSelf = m.user_id === currentUserId;
              const isPrimaryAdmin = m.role === "admin_primary";

              return (
                <div
                  key={m.membership_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 18px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface)",
                    border: "var(--glass-border)",
                  }}
                >
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div className="user-avatar" style={{ width: 38, height: 38 }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.98rem" }}>
                        {m.name} {isSelf && <span style={{ color: "var(--accent-primary)", fontSize: "0.8rem" }}>(You)</span>}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                        {m.email} • Joined: {new Date(m.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {isAdmin && !isSelf && !isPrimaryAdmin ? (
                      <select
                        className="form-select"
                        style={{ padding: "4px 8px", fontSize: "0.82rem", width: 140 }}
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                      >
                        <option value="admin">Administrator</option>
                        <option value="parent">Parent/Guardian</option>
                        <option value="spouse">Spouse/Partner</option>
                        <option value="senior">Senior Member</option>
                        <option value="child">Child</option>
                        <option value="caregiver">Caregiver</option>
                        <option value="member">General Member</option>
                      </select>
                    ) : (
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "var(--radius-pill)",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          background: isPrimaryAdmin ? "rgba(124,77,255,0.18)" : "rgba(0,176,255,0.12)",
                          color: isPrimaryAdmin ? "var(--accent-primary)" : "var(--accent-cyan)",
                        }}
                      >
                        {m.role.replace("_", " ").toUpperCase()}
                      </span>
                    )}

                    {isAdmin && !isSelf && !isPrimaryAdmin && (
                      <button className="icon-btn" onClick={() => handleRemoveMember(m.user_id)} title="Remove member">
                        <Trash2 size={16} color="var(--accent-rose)" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Invitations */}
      {activeTab === "invites" && (
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700 }}>
                Active Household Invitations
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Cryptographically secure invitation links with usage limits and automatic expiration.
              </p>
            </div>

            <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
              <Plus size={16} />
              <span>Create Invitation Link</span>
            </button>
          </div>

          {invitations.length === 0 ? (
            <div className="empty-state">
              <Key className="empty-icon" />
              <div className="empty-title">No active invitations</div>
              <div className="empty-subtitle">Generate an invitation link to onboard family members or caregivers.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {invitations.map((inv) => {
                const isRevoked = Boolean(inv.revoked_at);
                const isExpired = new Date(inv.expires_at) < new Date();
                const isExhausted = inv.used_count >= inv.max_uses;

                return (
                  <div
                    key={inv.id}
                    style={{
                      padding: 14,
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-surface)",
                      border: "var(--glass-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      opacity: isRevoked || isExpired || isExhausted ? 0.6 : 1,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        Role: <strong>{inv.role}</strong> • Uses: {inv.used_count} / {inv.max_uses}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                        Expires: {new Date(inv.expires_at).toLocaleDateString()}
                        {isRevoked && <span style={{ color: "var(--accent-rose)", marginLeft: 8 }}>[REVOKED]</span>}
                        {isExpired && <span style={{ color: "var(--accent-rose)", marginLeft: 8 }}>[EXPIRED]</span>}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {!isRevoked && !isExpired && (
                        <>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            onClick={() => copyToClipboard(`${window.location.origin}/join/${inv.token}`)}
                          >
                            <Copy size={14} /> Copy Link
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            onClick={() => handleRevokeInvite(inv.id)}
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Audit Log */}
      {activeTab === "audit" && isAdmin && (
        <div className="glass-card">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, marginBottom: 16 }}>
            Security Audit Trail
          </h3>

          {auditLogs.length === 0 ? (
            <div className="empty-state">
              <History className="empty-icon" />
              <div className="empty-title">No audit events recorded yet</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: 10,
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--glass-border-subtle)",
                    fontSize: "0.82rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: "var(--accent-primary)" }}>{log.action}</span>
                    <span style={{ color: "var(--text-muted)" }}>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>
                    Actor: {log.actor_name || "System"} • Resource: {log.resource_type} (#{log.resource_id})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>
              Create Invitation Link
            </h2>

            {!generatedLink ? (
              <form onSubmit={handleCreateInvite}>
                <div className="form-group">
                  <label className="form-label">Granted Role</label>
                  <select
                    className="form-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                  >
                    <option value="member">General Member</option>
                    <option value="parent">Parent / Guardian</option>
                    <option value="spouse">Spouse / Partner</option>
                    <option value="senior">Senior Member</option>
                    <option value="child">Child</option>
                    <option value="caregiver">Caregiver</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Max Uses</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      className="form-input"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expires In (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      className="form-input"
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Generate Link
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                  Share this secure invitation link with the member:
                </p>
                <div
                  style={{
                    padding: 12,
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-input)",
                    border: "var(--glass-border)",
                    wordBreak: "break-all",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  {generatedLink}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => copyToClipboard(generatedLink)}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? "Copied!" : "Copy Link"}</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setGeneratedLink(null);
                      setShowInviteModal(false);
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
