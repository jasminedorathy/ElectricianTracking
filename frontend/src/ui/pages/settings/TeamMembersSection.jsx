import { useState, useEffect } from "react"
import {
  Users, UserPlus, Mail, Shield, Trash2, ChevronDown,
  Clock, Check, X, Loader2, Search,
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { useAuth } from "../../../state/auth/useAuth.js"

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "#7C3AED", bg: "#F5F3FF" },
  manager: { label: "Manager", color: "#1A56DB", bg: "#EFF4FF" },
  employee: { label: "Employee", color: "#059669", bg: "#ECFDF5" },
  kiosk: { label: "Kiosk", color: "#D97706", bg: "#FFFBEB" },
}

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, color: "var(--muted)", bg: "var(--bg2)" }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function RoleMenu({ value, onChange, exclude = [] }) {
  const [open, setOpen] = useState(false)
  const options = Object.entries(ROLE_CONFIG).filter(([k]) => !exclude.includes(k))
  return (
    <div style={{ position: "relative" }}>
      <button
        className="stGhostBtn"
        style={{ fontSize: 12, padding: "4px 10px" }}
        onClick={() => setOpen(o => !o)}
      >
        <RoleBadge role={value} /> <ChevronDown size={11} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200,
          background: "var(--surface)", border: "1px solid var(--stroke2)", borderRadius: 10,
          padding: 6, boxShadow: "0 8px 24px rgba(0,0,0,.1)", minWidth: 140,
        }}>
          {options.map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false) }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "8px 10px", background: "none", border: "none", borderRadius: 6,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                color: key === value ? cfg.color : "var(--fg2)",
                background: key === value ? cfg.bg : "transparent",
              }}
            >
              {key === value && <Check size={11} style={{ color: cfg.color }} />}
              {cfg.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeamMembersSection({ showToast, SectionHeader }) {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [inviteForm, setInviteForm] = useState({ email: "", role: "employee" })
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [changingRole, setChangingRole] = useState(null)
  const [revoking, setRevoking] = useState(null)
  const [showInviteForm, setShowInviteForm] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [membersRes, invitesRes] = await Promise.all([
        apiRequest("/settings/team/members/"),
        isAdmin ? apiRequest("/settings/team/invites/") : Promise.resolve({ data: [] }),
      ])
      setMembers(membersRes?.data || [])
      setInvites(invitesRes?.data || [])
    } catch {
      showToast("Failed to load team.", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleInvite = async () => {
    if (!inviteForm.email) { showToast("Email is required.", "error"); return }
    setInviting(true)
    try {
      const res = await apiRequest("/settings/team/invites/", { method: "POST", json: inviteForm })
      showToast(res?.message || "Invite sent.")
      setInvites(prev => [res.data, ...prev])
      setInviteForm({ email: "", role: "employee" })
      setShowInviteForm(false)
    } catch (err) {
      showToast(err?.body?.message || "Failed to send invite.", "error")
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (memberId, newRole) => {
    setChangingRole(memberId)
    try {
      await apiRequest(`/settings/team/members/${memberId}/`, { method: "PATCH", json: { role: newRole } })
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
      showToast("Role updated.")
    } catch (err) {
      showToast(err?.body?.message || "Failed to update role.", "error")
    } finally {
      setChangingRole(null) }
  }

  const handleRemove = async (memberId) => {
    if (!confirm("Remove this member from the workspace? They will lose all access.")) return
    setRemoving(memberId)
    try {
      await apiRequest(`/settings/team/members/${memberId}/`, { method: "DELETE" })
      setMembers(prev => prev.filter(m => m.id !== memberId))
      showToast("Member removed.")
    } catch (err) {
      showToast(err?.body?.message || "Failed to remove member.", "error")
    } finally {
      setRemoving(null) }
  }

  const handleRevokeInvite = async (inviteId) => {
    setRevoking(inviteId)
    try {
      await apiRequest(`/settings/team/invites/${inviteId}/`, { method: "DELETE" })
      setInvites(prev => prev.filter(i => i.id !== inviteId))
      showToast("Invite cancelled.")
    } catch (err) {
      showToast(err?.body?.message || "Failed to cancel invite.", "error")
    } finally {
      setRevoking(null) }
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    const matchesRole = !roleFilter || m.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="stPanel">
      <SectionHeader title="Team & Members" subtitle="Invite teammates, assign roles, and manage workspace access." />

      {/* Action bar */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
              <input
                className="stInput"
                style={{ paddingLeft: 30 }}
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="stInput stSelect" style={{ width: 130 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              {Object.entries(ROLE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {isAdmin && (
            <button className="stPrimaryBtn" onClick={() => setShowInviteForm(v => !v)}>
              <UserPlus size={13} /> Invite member
            </button>
          )}
        </div>

        {/* Invite form */}
        {showInviteForm && isAdmin && (
          <div style={{ marginTop: 20, padding: 20, background: "var(--bg2)", borderRadius: 10, border: "1px dashed var(--stroke2)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", marginBottom: 14 }}>Send invitation</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Email address</div>
                <div className="stInputAddon">
                  <span className="stInputAddonPrefix"><Mail size={12} /></span>
                  <input
                    className="stInput stInputAddonField"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteForm.email}
                    onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ width: 150 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Role</div>
                <select
                  className="stInput stSelect"
                  value={inviteForm.role}
                  onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="stPrimaryBtn" onClick={handleInvite} disabled={inviting || !inviteForm.email}>
                  {inviting ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Mail size={13} />}
                  Send invite
                </button>
                <button className="stGhostBtn" onClick={() => setShowInviteForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Members table */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>
            Members <span style={{ color: "var(--muted)", fontWeight: 500 }}>({filtered.length})</span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
            <Loader2 size={24} style={{ animation: "spin .7s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "var(--muted)", fontSize: 13 }}>
            {search || roleFilter ? "No members match your filter." : "No team members yet."}
          </div>
        ) : (
          <div>
            {filtered.map(member => (
              <div key={member.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 0", borderBottom: "1px solid var(--stroke)", gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg, #0B1629, #1A56DB)",
                    color: "#fff", fontSize: 13, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {(member.name?.[0] || member.username?.[0] || "U").toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", display: "flex", alignItems: "center", gap: 8 }}>
                      {member.name || member.username}
                      {member.is_current_user && <span style={{ fontSize: 10, background: "var(--bg2)", color: "var(--muted)", padding: "1px 6px", borderRadius: 10 }}>You</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={10} />
                    {new Date(member.date_joined).toLocaleDateString()}
                  </div>
                  {isAdmin && !member.is_current_user ? (
                    <RoleMenu
                      value={member.role}
                      onChange={role => handleRoleChange(member.id, role)}
                      exclude={["kiosk"]}
                    />
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                  {isAdmin && !member.is_current_user && (
                    <button
                      onClick={() => handleRemove(member.id)}
                      disabled={removing === member.id}
                      style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}
                    >
                      {removing === member.id ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Trash2 size={13} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {isAdmin && invites.length > 0 && (
        <div className="stCard">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Clock size={15} style={{ color: "#D97706" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Pending Invitations ({invites.length})</span>
          </div>
          {invites.map(invite => (
            <div key={invite.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: "1px solid var(--stroke)", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mail size={14} style={{ color: "#D97706" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{invite.email}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    Invited by {invite.invited_by_name} · Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <RoleBadge role={invite.role} />
                <span style={{ fontSize: 11, background: invite.is_expired ? "#FEF2F2" : "#FFFBEB", color: invite.is_expired ? "#DC2626" : "#D97706", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>
                  {invite.is_expired ? "Expired" : "Pending"}
                </span>
                <button
                  onClick={() => handleRevokeInvite(invite.id)}
                  disabled={revoking === invite.id}
                  className="stDangerBtn"
                >
                  {revoking === invite.id ? <Loader2 size={11} style={{ animation: "spin .7s linear infinite" }} /> : <X size={11} />}
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
