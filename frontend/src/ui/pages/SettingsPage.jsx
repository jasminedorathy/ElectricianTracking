import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from "react"
import { useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { routes } from "../routes.js"
import { Button } from "../components/kit.jsx"
import { useAuth } from "../../state/auth/useAuth.js"
import {
  User, Shield, Palette, Bell, CreditCard, Users2, Plug,
  Building2, Database, AlertTriangle, ShieldCheck, RefreshCcw,
  CheckCircle2, X, Save, ChevronRight,
} from "lucide-react"

/* ── Lazy section imports ─────────────────────────────────────── */
const ProfileSection        = lazy(() => import("./settings/ProfileSection.jsx"))
const AccountSecuritySection = lazy(() => import("./settings/AccountSecuritySection.jsx"))
const AppearanceSection     = lazy(() => import("./settings/AppearanceSection.jsx"))
const NotificationsSection  = lazy(() => import("./settings/NotificationsSection.jsx"))
const BillingSection        = lazy(() => import("./settings/BillingSection.jsx"))
const TeamMembersSection    = lazy(() => import("./settings/TeamMembersSection.jsx"))
const IntegrationsApiSection = lazy(() => import("./settings/IntegrationsApiSection.jsx"))
const WorkspaceSection      = lazy(() => import("./settings/WorkspaceSection.jsx"))
const PrivacyDataSection    = lazy(() => import("./settings/PrivacyDataSection.jsx"))
const DangerZoneSection     = lazy(() => import("./settings/DangerZoneSection.jsx"))

/* ── Helpers ─────────────────────────────────────────────────── */
function Toast({ message, type = "success", onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3500); return () => clearTimeout(t) }, [onDismiss])
  return (
    <div className="stToast" data-type={type}>
      {type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
      <span>{message}</span>
      <button onClick={onDismiss} className="stToastClose"><X size={13} /></button>
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--fg)", marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{subtitle}</p>
    </div>
  )
}

export function Field({ label, children, half }) {
  return (
    <div style={{ width: half ? "50%" : "100%", display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </label>
      {children}
    </div>
  )
}

/* ── Tabs ────────────────────────────────────────────────────── */
const TABS = [
  {
    id: "profile",
    label: "My Profile",
    subtitle: "Update your personal information, avatar, timezone, and language.",
    icon: <User size={15} />,
    to: routes.settings_profile,
  },
  {
    id: "security",
    label: "Account & Security",
    subtitle: "Email, password, two-factor authentication, and active sessions.",
    icon: <Shield size={15} />,
    to: routes.settings_security,
  },
  {
    id: "appearance",
    label: "Appearance",
    subtitle: "Theme, accent color, density, and font size preferences.",
    icon: <Palette size={15} />,
    to: routes.settings_appearance,
  },
  {
    id: "notifications",
    label: "Notifications",
    subtitle: "Email, in-app, and SMS notification preferences per event.",
    icon: <Bell size={15} />,
    to: routes.settings_notifications,
  },
  {
    id: "billing",
    label: "Billing & Plans",
    subtitle: "Manage your subscription, invoices, payment method, and usage.",
    icon: <CreditCard size={15} />,
    adminOnly: true,
    to: routes.settings_billing,
  },
  {
    id: "team",
    label: "Team & Members",
    subtitle: "Invite members, assign roles, and manage workspace access.",
    icon: <Users2 size={15} />,
    adminOnly: true,
    to: routes.settings_team,
  },
  {
    id: "integrations",
    label: "Integrations & API",
    subtitle: "API keys, webhook endpoints, and connected OAuth apps.",
    icon: <Plug size={15} />,
    adminOnly: true,
    to: routes.settings_integrations,
  },
  {
    id: "organization",
    label: "Workspace",
    subtitle: "Organization name, logo, timezone, and data region.",
    icon: <Building2 size={15} />,
    adminOnly: true,
    to: routes.settings_organization,
  },
  {
    id: "data",
    label: "Privacy & Data",
    subtitle: "GDPR export, cookie preferences, audit log, and account deletion.",
    icon: <Database size={15} />,
    to: routes.settings_data,
  },
  {
    id: "danger",
    label: "Danger Zone",
    subtitle: "Transfer ownership, delete workspace, and irreversible actions.",
    icon: <AlertTriangle size={15} />,
    adminOnly: true,
    to: routes.settings_danger,
  },
]

/* ── Page ────────────────────────────────────────────────────── */
export function SettingsPage({ section: sectionProp }) {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const location = useLocation()

  const [activeSection, setActiveSection] = useState("profile")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const filteredTabs = useMemo(() => TABS.filter(t => !t.adminOnly || isAdmin), [isAdmin])

  const markDirty = useCallback(() => setDirty(true), [])
  const showToast = useCallback((msg, type = "success") => setToast({ msg, type, id: Date.now() }), [])

  useEffect(() => {
    const section = sectionProp || new URLSearchParams(location.search).get("section")
    if (!section) return
    const match = filteredTabs.find(s => s.id === section)
    if (match) setActiveSection(match.id)
  }, [location.search, sectionProp, filteredTabs])

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setDirty(false)
    showToast("Changes saved.")
  }

  const activeSub = filteredTabs.find(s => s.id === activeSection) || filteredTabs[0]

  const Loader = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--stroke)", borderTopColor: "#5d5fef", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        borderRight: "1px solid var(--stroke)",
        background: "var(--surface)",
        padding: "32px 0",
        overflowY: "auto",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}>
        <div style={{ padding: "0 16px 20px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Settings
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 8px" }}>
          {filteredTabs.map(tab => {
            const isActive = activeSection === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#5d5fef" : "var(--fg)",
                  background: isActive ? "rgba(93,95,239,0.08)" : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ color: isActive ? "#5d5fef" : "var(--muted)", flexShrink: 0 }}>{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "48px 56px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 32 }}>
          <span style={{ opacity: 0.5 }}>Settings</span>
          <ChevronRight size={10} />
          <span style={{ color: "#5d5fef" }}>{activeSub?.label}</span>
        </div>

        {/* Animated section */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Suspense fallback={<Loader />}>
              {activeSection === "profile"       && <ProfileSection markDirty={markDirty} showToast={showToast} Field={Field} SectionHeader={SectionHeader} />}
              {activeSection === "security"      && <AccountSecuritySection markDirty={markDirty} showToast={showToast} Field={Field} SectionHeader={SectionHeader} />}
              {activeSection === "appearance"    && <AppearanceSection showToast={showToast} SectionHeader={SectionHeader} />}
              {activeSection === "notifications" && <NotificationsSection showToast={showToast} SectionHeader={SectionHeader} />}
              {activeSection === "billing"       && <BillingSection showToast={showToast} SectionHeader={SectionHeader} />}
              {activeSection === "team"          && <TeamMembersSection showToast={showToast} SectionHeader={SectionHeader} />}
              {activeSection === "integrations"  && <IntegrationsApiSection showToast={showToast} SectionHeader={SectionHeader} />}
              {activeSection === "organization"  && <WorkspaceSection showToast={showToast} SectionHeader={SectionHeader} />}
              {activeSection === "data"          && <PrivacyDataSection showToast={showToast} SectionHeader={SectionHeader} />}
              {activeSection === "danger"        && <DangerZoneSection showToast={showToast} SectionHeader={SectionHeader} />}
            </Suspense>
          </motion.div>
        </AnimatePresence>

        {/* Save bar */}
        <AnimatePresence>
          {dirty && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 50 }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "14px 20px", background: "var(--surface)",
                border: "1px solid var(--stroke)", borderRadius: 16,
                boxShadow: "0 8px 32px rgba(0,0,0,.18)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s ease-in-out infinite" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Unsaved changes</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setDirty(false)}
                    style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", borderRadius: 8 }}
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 16px", fontSize: 12, fontWeight: 700,
                      color: "#fff", background: "#5d5fef",
                      border: "none", borderRadius: 8, cursor: "pointer",
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? <RefreshCcw size={13} style={{ animation: "spin 0.7s linear infinite" }} /> : <Save size={13} />}
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {toast && <Toast key={toast.id} message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
      </main>
    </div>
  )
}
