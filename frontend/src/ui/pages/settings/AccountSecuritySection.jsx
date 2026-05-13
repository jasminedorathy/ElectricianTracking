import { useState, useEffect } from "react"
import {
  Shield, Mail, Lock, Smartphone, Eye, EyeOff,
  LogOut, Clock, MapPin, Loader2, Copy, Check,
  AlertTriangle, CheckCircle2, QrCode, Key,
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { useAuth } from "../../../state/auth/useAuth.js"

function Toggle({ checked, onChange }) {
  return (
    <div className={`stToggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}>
      <div className="stToggleKnob" />
    </div>
  )
}

function SessionCard({ session, onRevoke, revoking }) {
  const icons = { browser: "🌐", mobile: "📱", api: "⚙️" }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--stroke)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 22 }}>{icons[session.device_type] || "🌐"}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>
            {session.device_name || "Unknown device"}
            {session.is_current && (
              <span style={{ marginLeft: 8, fontSize: 11, background: "#ECFDF5", color: "#059669", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>Current</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, display: "flex", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} />{session.location || "Unknown location"}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} />
              {session.last_active ? new Date(session.last_active).toLocaleString() : "—"}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: 2 }}>{session.ip_address}</div>
        </div>
      </div>
      {!session.is_current && (
        <button onClick={() => onRevoke(session.id)} disabled={revoking === session.id} className="stDangerBtn">
          {revoking === session.id ? <Loader2 size={11} style={{ animation: "spin .7s linear infinite" }} /> : "Revoke"}
        </button>
      )}
    </div>
  )
}

export default function AccountSecuritySection({ markDirty, showToast, Field, SectionHeader }) {
  const { user } = useAuth()

  // Email change state
  const [emailForm, setEmailForm] = useState({ new_email: "", password: "" })
  const [emailSaving, setEmailSaving] = useState(false)

  // Password change state
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" })
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const [pwSaving, setPwSaving] = useState(false)

  // 2FA state
  const [twofa, setTwofa] = useState({ enabled: false, qrCode: null, secret: null, verifyCode: "", backupCodes: null, step: "idle" })
  const [tfaSaving, setTfaSaving] = useState(false)

  // Sessions state
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [revokingSession, setRevokingSession] = useState(null)

  // Login history
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    if (user) setTwofa(prev => ({ ...prev, enabled: user.two_fa_enabled || false }))
  }, [user])

  useEffect(() => {
    apiRequest("/settings/sessions/")
      .then(res => setSessions(res?.data || []))
      .catch(() => {})
      .finally(() => setSessionsLoading(false))
    apiRequest("/settings/login-history/")
      .then(res => setHistory(res?.data || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [])

  // Email change
  const handleEmailChange = async () => {
    if (!emailForm.new_email || !emailForm.password) { showToast("All fields are required.", "error"); return }
    setEmailSaving(true)
    try {
      await apiRequest("/auth/email/change/", { method: "POST", json: emailForm })
      showToast("Email updated successfully.")
      setEmailForm({ new_email: "", password: "" })
    } catch (err) {
      showToast(err?.body?.message || "Failed to update email.", "error")
    } finally { setEmailSaving(false) }
  }

  // Password change
  const handlePasswordChange = async () => {
    if (!pwForm.current_password || !pwForm.new_password) { showToast("All fields are required.", "error"); return }
    if (pwForm.new_password !== pwForm.confirm_password) { showToast("Passwords do not match.", "error"); return }
    if (pwForm.new_password.length < 8) { showToast("Password must be at least 8 characters.", "error"); return }
    setPwSaving(true)
    try {
      await apiRequest("/auth/password/change/", { method: "POST", json: pwForm })
      showToast("Password changed successfully.")
      setPwForm({ current_password: "", new_password: "", confirm_password: "" })
    } catch (err) {
      showToast(err?.body?.message || "Failed to change password.", "error")
    } finally { setPwSaving(false) }
  }

  // 2FA
  const handle2FASetup = async () => {
    setTfaSaving(true)
    try {
      const res = await apiRequest("/auth/2fa/", { method: "GET" })
      setTwofa(prev => ({ ...prev, qrCode: res.data.qr_code, secret: res.data.secret, step: "verify" }))
    } catch (err) {
      showToast(err?.body?.message || "Failed to setup 2FA.", "error")
    } finally { setTfaSaving(false) }
  }

  const handle2FAVerify = async () => {
    if (!twofa.verifyCode) { showToast("Enter the 6-digit code.", "error"); return }
    setTfaSaving(true)
    try {
      const res = await apiRequest("/auth/2fa/", { method: "POST", json: { code: twofa.verifyCode } })
      setTwofa(prev => ({ ...prev, enabled: true, step: "done", backupCodes: res.data?.backup_codes || [] }))
      showToast("Two-factor authentication enabled.")
    } catch (err) {
      showToast(err?.body?.message || "Invalid code.", "error")
    } finally { setTfaSaving(false) }
  }

  const handle2FADisable = async (password) => {
    setTfaSaving(true)
    try {
      await apiRequest("/auth/2fa/", { method: "DELETE", json: { password } })
      setTwofa({ enabled: false, qrCode: null, secret: null, verifyCode: "", backupCodes: null, step: "idle" })
      showToast("Two-factor authentication disabled.")
    } catch (err) {
      showToast(err?.body?.message || "Failed to disable 2FA.", "error")
    } finally { setTfaSaving(false) }
  }

  const handleRevokeSession = async (id) => {
    setRevokingSession(id)
    try {
      await apiRequest(`/settings/sessions/${id}/`, { method: "DELETE" })
      setSessions(prev => prev.filter(s => s.id !== id))
      showToast("Session revoked.")
    } catch (err) {
      showToast(err?.body?.message || "Failed to revoke session.", "error")
    } finally { setRevokingSession(null) }
  }

  const handleRevokeAll = async () => {
    try {
      await apiRequest("/settings/sessions/revoke-all/", { method: "POST" })
      setSessions(prev => prev.filter(s => s.is_current))
      showToast("All other sessions revoked.")
    } catch (err) {
      showToast("Failed to revoke sessions.", "error")
    }
  }

  const statusColor = { success: "#059669", failed: "#DC2626", mfa_required: "#D97706" }

  return (
    <div className="stPanel">
      <SectionHeader title="Account & Security" subtitle="Manage your email, password, two-factor authentication, and active sessions." />

      {/* Email Change */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Mail size={15} style={{ color: "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Change Email</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
          Current: <strong style={{ color: "var(--fg)" }}>{user?.email || "Not set"}</strong>
        </div>
        <div className="stFormGrid">
          <Field label="New email address">
            <input
              className="stInput"
              type="email"
              placeholder="new@example.com"
              value={emailForm.new_email}
              onChange={e => setEmailForm(p => ({ ...p, new_email: e.target.value }))}
            />
          </Field>
          <Field label="Confirm with password">
            <input
              className="stInput"
              type="password"
              placeholder="Current password"
              value={emailForm.password}
              onChange={e => setEmailForm(p => ({ ...p, password: e.target.value }))}
            />
          </Field>
        </div>
        <div className="stCardActions">
          <button className="stPrimaryBtn" onClick={handleEmailChange} disabled={emailSaving}>
            {emailSaving ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Mail size={13} />}
            Update email
          </button>
        </div>
      </div>

      {/* Password Change */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Lock size={15} style={{ color: "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Change Password</span>
        </div>
        <div className="stFormGrid">
          {[
            { label: "Current password", key: "current_password", showKey: "current" },
            { label: "New password", key: "new_password", showKey: "new" },
            { label: "Confirm new password", key: "confirm_password", showKey: "confirm" },
          ].map(({ label, key, showKey }) => (
            <Field key={key} label={label}>
              <div style={{ position: "relative" }}>
                <input
                  className="stInput"
                  type={showPw[showKey] ? "text" : "password"}
                  placeholder={label}
                  value={pwForm[key]}
                  style={{ paddingRight: 36 }}
                  onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                />
                <button
                  onClick={() => setShowPw(p => ({ ...p, [showKey]: !p[showKey] }))}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}
                >
                  {showPw[showKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </Field>
          ))}
          {pwForm.new_password && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Password strength</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[8, 12, 16].map(len => (
                  <div key={len} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: pwForm.new_password.length >= len ? "#059669" : "var(--stroke2)",
                    transition: "background .2s",
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                {pwForm.new_password.length < 8 ? "Too short" : pwForm.new_password.length < 12 ? "Moderate" : "Strong"}
              </div>
            </div>
          )}
        </div>
        <div className="stCardActions">
          <button className="stPrimaryBtn" onClick={handlePasswordChange} disabled={pwSaving}>
            {pwSaving ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Lock size={13} />}
            Update password
          </button>
        </div>
      </div>

      {/* 2FA */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Smartphone size={15} style={{ color: "#1A56DB" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Two-Factor Authentication</span>
            {twofa.enabled && (
              <span style={{ fontSize: 11, background: "#ECFDF5", color: "#059669", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>Enabled</span>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 16px" }}>
          Add an extra layer of security to your account using a time-based one-time password (TOTP) app like Google Authenticator or Authy.
        </p>

        {!twofa.enabled && twofa.step === "idle" && (
          <button className="stPrimaryBtn" onClick={handle2FASetup} disabled={tfaSaving}>
            {tfaSaving ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <QrCode size={13} />}
            Set up authenticator app
          </button>
        )}

        {twofa.step === "verify" && twofa.qrCode && (
          <div>
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 16 }}>
              <img src={twofa.qrCode} alt="QR Code" style={{ width: 140, height: 140, borderRadius: 8, border: "1px solid var(--stroke2)" }} />
              <div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                  1. Open your authenticator app and scan the QR code.
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                  2. Or enter this secret manually:
                </div>
                <code style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, background: "var(--bg2)", padding: "6px 10px", borderRadius: 6, display: "block" }}>
                  {twofa.secret}
                </code>
              </div>
            </div>
            <Field label="Enter 6-digit code from app">
              <input
                className="stInput"
                placeholder="000000"
                maxLength={6}
                value={twofa.verifyCode}
                onChange={e => setTwofa(prev => ({ ...prev, verifyCode: e.target.value.replace(/\D/g, "") }))}
                style={{ letterSpacing: 6, fontSize: 18, fontWeight: 700 }}
              />
            </Field>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="stPrimaryBtn" onClick={handle2FAVerify} disabled={tfaSaving || twofa.verifyCode.length !== 6}>
                {tfaSaving ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Check size={13} />}
                Verify & enable
              </button>
              <button className="stGhostBtn" onClick={() => setTwofa(prev => ({ ...prev, step: "idle", qrCode: null }))}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {twofa.step === "done" && twofa.backupCodes && (
          <div style={{ background: "var(--bg2)", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <CheckCircle2 size={15} style={{ color: "#059669" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>2FA enabled! Save your backup codes.</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
              Store these codes in a safe place. Each code can be used once if you lose access to your authenticator app.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {twofa.backupCodes.map((code, i) => (
                <code key={i} style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, background: "var(--surface)", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--stroke2)" }}>
                  {code}
                </code>
              ))}
            </div>
            <button
              className="stGhostBtn"
              style={{ marginTop: 12 }}
              onClick={() => navigator.clipboard.writeText(twofa.backupCodes.join("\n")).then(() => showToast("Backup codes copied."))}
            >
              <Copy size={12} /> Copy all codes
            </button>
          </div>
        )}

        {twofa.enabled && twofa.step !== "done" && (
          <Disable2FAPanel onDisable={handle2FADisable} saving={tfaSaving} />
        )}
      </div>

      {/* Active Sessions */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Smartphone size={15} style={{ color: "#1A56DB" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Active Sessions</span>
          </div>
          {sessions.filter(s => !s.is_current).length > 0 && (
            <button className="stDangerBtn" onClick={handleRevokeAll}>
              <LogOut size={11} /> Revoke all others
            </button>
          )}
        </div>

        {sessionsLoading ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
            <Loader2 size={20} style={{ animation: "spin .7s linear infinite" }} />
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 13 }}>No active sessions found.</div>
        ) : (
          <div>
            {sessions.map(session => (
              <SessionCard key={session.id} session={session} onRevoke={handleRevokeSession} revoking={revokingSession} />
            ))}
          </div>
        )}
      </div>

      {/* Login History */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Clock size={15} style={{ color: "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Login History</span>
        </div>

        {historyLoading ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
            <Loader2 size={20} style={{ animation: "spin .7s linear infinite" }} />
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", fontSize: 13 }}>No login history yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--stroke)" }}>
                  {["Date & Time", "IP Address", "Location", "Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(entry => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--stroke)" }}>
                    <td style={{ padding: "10px 12px", color: "var(--fg)" }}>{new Date(entry.created_at).toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{entry.ip_address || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{entry.location || "Unknown"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 11, background: entry.status === "success" ? "#ECFDF5" : "#FEF2F2", color: statusColor[entry.status] || "#7C8592", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Disable2FAPanel({ onDisable, saving }) {
  const [pw, setPw] = useState("")
  const [open, setOpen] = useState(false)
  return (
    <div>
      {!open ? (
        <button className="stDangerBtn" onClick={() => setOpen(true)}>
          <AlertTriangle size={11} /> Disable 2FA
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
          <input
            className="stInput"
            type="password"
            placeholder="Confirm password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <button className="stDangerBtn" onClick={() => onDisable(pw)} disabled={saving || !pw}>
            {saving ? <Loader2 size={11} style={{ animation: "spin .7s linear infinite" }} /> : null}
            Confirm disable
          </button>
          <button className="stGhostBtn" onClick={() => setOpen(false)} style={{ fontSize: 12 }}>Cancel</button>
        </div>
      )}
    </div>
  )
}
