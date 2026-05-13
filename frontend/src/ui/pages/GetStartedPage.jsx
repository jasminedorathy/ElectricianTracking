import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  MapPin, Clock, CalendarRange, Bell,
  CheckCircle2, ArrowRight, ChevronRight, Rocket,
  Building2, UserPlus, Settings2, Timer, Zap, Users,
} from "lucide-react"
import { useAuth } from "../../state/auth/useAuth.js"
import { routes } from "../routes.js"
import { CalTrackLogo } from "../components/CalTrackLogo.jsx"
import { apiRequest } from "../../api/client.js"

/* ── CalTrack brand tokens (from logo) ───────────────────────── */
const C = {
  navy:       "#0B2B6F",
  blue:       "#1A56DB",
  blueMid:    "#2563EB",
  blueLight:  "#60A5FA",
  amber:      "#F59E0B",
  amberDark:  "#D97706",
  amberLight: "#FDE68A",
}

/* ── Setup steps ─────────────────────────────────────────────── */
const STEPS = [
  {
    id: "location",
    icon: <MapPin size={20} />,
    title: "Add a Work Location",
    desc: "Set up your office or site address. CalTrack uses this to create GPS geofences for clock-in verification.",
    action: "Set up location",
    to: routes.locations,
    color: C.blue,
    bg: "#EFF6FF",
    est: "2 min",
  },
  {
    id: "employees",
    icon: <UserPlus size={20} />,
    title: "Add Your Team",
    desc: "Invite employees and assign roles. They'll get an email to create their account and start tracking time.",
    action: "Add employees",
    to: routes.employees,
    color: "#7C3AED",
    bg: "#F5F3FF",
    est: "5 min",
  },
  {
    id: "schedules",
    icon: <CalendarRange size={20} />,
    title: "Set Work Schedules",
    desc: "Define working days and hours so leave requests and payroll calculations stay accurate.",
    action: "Configure schedules",
    to: routes.settings_schedules,
    color: C.amberDark,
    bg: "#FFFBEB",
    est: "3 min",
  },
  {
    id: "timetracking",
    icon: <Clock size={20} />,
    title: "Configure Time Tracking",
    desc: "Choose how your team clocks in — web, mobile, or kiosk. Set overtime and break rules.",
    action: "Set up time tracking",
    to: routes.settings_timetracking,
    color: "#059669",
    bg: "#ECFDF5",
    est: "4 min",
  },
  {
    id: "notifications",
    icon: <Bell size={20} />,
    title: "Turn On Notifications",
    desc: "Get alerts for leave approvals, payroll readiness, shift reminders, and security events.",
    action: "Set notifications",
    to: routes.settings_notifications,
    color: "#DC2626",
    bg: "#FEF2F2",
    est: "2 min",
  },
]

const STORAGE_KEY = "caltrack.onboarding.completed"

function loadCompleted() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")) }
  catch { return new Set() }
}

function saveCompleted(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

/* ── Progress ring ───────────────────────────────────────────── */
function ProgressRing({ pct }) {
  const r = 38, circ = 2 * Math.PI * r
  return (
    <div style={{ position: "relative", width: 92, height: 92, flexShrink: 0 }}>
      <svg width="92" height="92" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
        <motion.circle
          cx="46" cy="46" r={r}
          fill="none"
          stroke={C.amber}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>done</span>
      </div>
    </div>
  )
}

/* ── Step card ───────────────────────────────────────────────── */
function StepCard({ step, index, done, onToggle, onGo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index + 0.3, duration: 0.35 }}
      style={{
        background: done ? "#F0FDF4" : "var(--surface)",
        border: `1.5px solid ${done ? "#BBF7D0" : "var(--stroke2)"}`,
        borderRadius: 14,
        padding: "18px 22px 18px 26px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        position: "relative",
        overflow: "hidden",
        opacity: done ? 0.8 : 1,
        transition: "opacity 0.3s, border-color 0.3s, background 0.3s",
      }}
    >
      {/* Left color stripe */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: done ? "#22C55E" : step.color,
        transition: "background 0.3s",
      }} />

      {/* Icon */}
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: done ? "#DCFCE7" : step.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: done ? "#16A34A" : step.color,
        transition: "background 0.3s, color 0.3s",
      }}>
        {done ? <CheckCircle2 size={20} /> : step.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 14, fontWeight: 700,
            color: done ? "#15803D" : "var(--fg)",
            textDecoration: done ? "line-through" : "none",
            opacity: done ? 0.75 : 1,
            transition: "all 0.3s",
          }}>
            {step.title}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: "var(--muted)",
            background: "var(--bg2)", borderRadius: 6,
            padding: "2px 6px", textTransform: "uppercase",
            letterSpacing: "0.06em", flexShrink: 0,
          }}>
            ~{step.est}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>
          {step.desc}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {!done && (
          <button
            onClick={() => onGo(step)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9,
              background: step.color, color: "#fff",
              border: "none", fontSize: 12, fontWeight: 700,
              cursor: "pointer", whiteSpace: "nowrap",
              transition: "filter 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.transform = "translateY(-1px)" }}
            onMouseLeave={e => { e.currentTarget.style.filter = ""; e.currentTarget.style.transform = "" }}
          >
            {step.action} <ChevronRight size={13} />
          </button>
        )}

        {/* Check toggle */}
        <button
          onClick={() => onToggle(step.id)}
          title={done ? "Mark incomplete" : "Mark complete"}
          style={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
            border: `2px solid ${done ? "#22C55E" : "var(--stroke2)"}`,
            background: done ? "#22C55E" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => { if (!done) e.currentTarget.style.borderColor = C.blue }}
          onMouseLeave={e => { if (!done) e.currentTarget.style.borderColor = "var(--stroke2)" }}
        >
          {done && <CheckCircle2 size={14} style={{ color: "#fff" }} />}
        </button>
      </div>
    </motion.div>
  )
}

/* ── Page ────────────────────────────────────────────────────── */
export function GetStartedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [completed, setCompleted] = useState(loadCompleted)
  const [orgName, setOrgName] = useState(() => localStorage.getItem("quicktims.orgName") || "")
  const [employees, setEmployees] = useState(0)

  const displayName = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : "there"

  const doneCount = completed.size
  const total = STEPS.length
  const pct = Math.round((doneCount / total) * 100)
  const allDone = doneCount === total

  useEffect(() => {
    apiRequest("/employees/")
      .then(r => setEmployees(r?.data?.length ?? r?.count ?? 0))
      .catch(() => {})
    apiRequest("/company/me")
      .then(r => {
        if (r?.company_name) {
          setOrgName(r.company_name)
          localStorage.setItem("quicktims.orgName", r.company_name)
        }
      })
      .catch(() => {})
  }, [])

  const toggle = (id) => {
    setCompleted(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveCompleted(next)
      return next
    })
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 58%, ${C.blueMid} 100%)`,
        padding: "52px 64px 44px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Amber radial glow */}
        <div style={{
          position: "absolute", top: -120, right: -120,
          width: 420, height: 420, borderRadius: "50%",
          background: `radial-gradient(circle, ${C.amber}28 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        {/* Subtle grid */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.035,
          backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 39px,${C.blueLight} 40px),
                            repeating-linear-gradient(90deg,transparent,transparent 39px,${C.blueLight} 40px)`,
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{ marginBottom: 36 }}
        >
          <CalTrackLogo size="md" showTagline theme="dark" />
        </motion.div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>

          {/* Headline */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{
                fontSize: 40, fontWeight: 900, color: "#fff",
                margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1.15,
              }}
            >
              Welcome, {displayName}!
            </motion.h1>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              style={{
                fontSize: 32, fontWeight: 800, color: C.amberLight,
                margin: "0 0 16px", letterSpacing: "-0.02em", lineHeight: 1.2,
              }}
            >
              Let's set up CalTrack.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              style={{
                fontSize: 15, color: "rgba(255,255,255,0.65)",
                maxWidth: 460, lineHeight: 1.7, margin: 0,
              }}
            >
              Complete these steps to get your team tracking time, managing leave, and running payroll — all in one place.
            </motion.p>
          </div>

          {/* Progress ring + CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}
          >
            <ProgressRing pct={pct} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
                {doneCount} of {total} steps complete
              </div>
              {allDone ? (
                <button
                  onClick={() => navigate(routes.dashboard)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 18px", background: C.amber,
                    color: C.navy, border: "none", borderRadius: 10,
                    fontSize: 13, fontWeight: 800, cursor: "pointer",
                  }}
                >
                  <Rocket size={14} /> Go to Dashboard
                </button>
              ) : (
                <button
                  onClick={() => navigate(routes.dashboard)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px",
                    background: "rgba(255,255,255,0.09)",
                    color: "rgba(255,255,255,0.62)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.16)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
                >
                  Skip for now <ArrowRight size={12} />
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Meta chips */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap" }}
        >
          {[
            { icon: <Building2 size={13} />, label: orgName || "Organization not set" },
            { icon: <Users size={13} />, label: `${employees} team member${employees !== 1 ? "s" : ""}` },
            { icon: <Timer size={13} />, label: "~16 min to complete" },
            { icon: <Zap size={13} style={{ color: C.amber }} />, label: `${doneCount}/${total} steps done` },
          ].map((chip, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "6px 14px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.13)",
              borderRadius: 20,
              fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.68)",
            }}>
              {chip.icon} {chip.label}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: "36px 64px 48px", maxWidth: 860 }}>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Zap size={14} style={{ color: C.amber }} />
          <span style={{
            fontSize: 11, fontWeight: 800, color: "var(--muted)",
            textTransform: "uppercase", letterSpacing: "0.12em",
          }}>
            Setup checklist
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--stroke)" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
            {doneCount}/{total} complete
          </span>
        </div>

        {/* Step cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {STEPS.map((step, i) => (
            <StepCard
              key={step.id}
              step={step}
              index={i}
              done={completed.has(step.id)}
              onToggle={toggle}
              onGo={(s) => navigate(s.to)}
            />
          ))}
        </div>

        {/* All-done banner */}
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 24, padding: "24px 28px",
              background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
              borderRadius: 14, display: "flex", alignItems: "center", gap: 20,
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
              background: C.amber,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CheckCircle2 size={24} style={{ color: C.navy }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 3 }}>
                You're all set — CalTrack is ready!
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                Your team can now clock in, request leave, and run payroll from one place.
              </div>
            </div>
            <button
              onClick={() => navigate(routes.dashboard)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "11px 20px", background: C.amber,
                color: C.navy, border: "none", borderRadius: 11,
                fontSize: 13, fontWeight: 800, cursor: "pointer", flexShrink: 0,
              }}
            >
              <Rocket size={14} /> Open Dashboard
            </button>
          </motion.div>
        )}

        {/* Tip */}
        <div style={{
          marginTop: 20, padding: "13px 18px",
          background: "var(--surface)", borderRadius: 10,
          border: "1px solid var(--stroke)",
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <Settings2 size={14} style={{ color: C.blue, marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: "var(--fg)" }}>Tip:</strong> Return here anytime from the sidebar. Your progress is saved automatically and survives page refreshes.
          </p>
        </div>
      </div>
    </div>
  )
}
