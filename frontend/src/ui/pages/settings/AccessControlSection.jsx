import { useState } from "react"
import { ShieldCheck, Lock, Eye, Edit3, Check, RefreshCcw, Info, Globe, MapPin, Activity, Users, CreditCard, BarChart3 } from "lucide-react"
import { Button, Card, Pill } from "../../components/kit.jsx"

const MODULES = [
  { id: "live_location", label: "Live Location Tracking", icon: <Globe size={18} />, desc: "Real-time GPS tracking and live operations dashboard." },
  { id: "locations", label: "Work Locations", icon: <MapPin size={18} />, desc: "Define job sites, geofences, and site-specific rules." },
  { id: "attendance", label: "Attendance & Time", icon: <Activity size={18} />, desc: "Clock-in/out, timesheets, and attendance intelligence." },
  { id: "payroll", label: "Payroll & Billing", icon: <CreditCard size={18} />, desc: "Salary calculation, invoices, and financial reports." },
  { id: "reports", label: "Advanced Analytics", icon: <BarChart3 size={18} />, desc: "Deep dive metrics and executive reporting." },
]

export default function AccessControlSection() {
  const [permissions, setPermissions] = useState({
    live_location: { admin: ["view", "modify"], employee: ["view"] },
    locations: { admin: ["view", "modify"], employee: [] },
    attendance: { admin: ["view", "modify"], employee: ["view", "modify"] },
    payroll: { admin: ["view", "modify"], employee: [] },
    reports: { admin: ["view"], employee: [] },
  })

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const togglePerm = (modId, role, action) => {
    setPermissions(prev => {
      const current = prev[modId][role]
      const next = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action]
      return {
        ...prev,
        [modId]: { ...prev[modId], [role]: next }
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="space-y-10 animate-fadeUp">
      <header>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Module Access Control</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Define which modules are accessible and modifiable by different user roles.</p>
      </header>

      <div className="grid gap-6">
        {MODULES.map(mod => (
          <div key={mod.id} className="bg-surface dark:bg-slate-900 border border-stroke dark:border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="flex gap-5 items-center flex-1">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                {mod.icon}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none mb-2">{mod.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{mod.desc}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-8 shrink-0">
              {/* Admin Permissions */}
              <div className="space-y-3">
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={12} /> Admin Control
                </div>
                <div className="flex gap-2">
                  <PermissionBtn
                    active={permissions[mod.id].admin.includes("view")}
                    onClick={() => togglePerm(mod.id, "admin", "view")}
                    icon={<Eye size={14} />}
                    label="View"
                  />
                  <PermissionBtn
                    active={permissions[mod.id].admin.includes("modify")}
                    onClick={() => togglePerm(mod.id, "admin", "modify")}
                    icon={<Edit3 size={14} />}
                    label="Modify"
                  />
                </div>
              </div>

              {/* Employee Permissions */}
              <div className="space-y-3">
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Users size={12} /> Employee Access
                </div>
                <div className="flex gap-2">
                  <PermissionBtn
                    active={permissions[mod.id].employee.includes("view")}
                    onClick={() => togglePerm(mod.id, "employee", "view")}
                    icon={<Eye size={14} />}
                    label="View"
                  />
                  <PermissionBtn
                    active={permissions[mod.id].employee.includes("modify")}
                    onClick={() => togglePerm(mod.id, "employee", "modify")}
                    icon={<Edit3 size={14} />}
                    label="Modify"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Advanced System Constraints --- */}
      <section className="mt-12">
        <header className="mb-8">
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ShieldCheck size={24} className="text-indigo-600" />
            Advanced System Constraints
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure deep-level restrictions for critical operational security.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConstraintCard
            title="SOS Response Authority"
            desc="Only users with this permission can acknowledge and resolve SOS emergency alerts."
            roles={["Super Admin", "Dispatchers"]}
          />
          <ConstraintCard
            title="Geofence Boundary Edit"
            desc="Control who can modify job site perimeters and geofencing sensitivity."
            roles={["Admin Only"]}
          />
          <ConstraintCard
            title="Manual Clock-In Override"
            desc="Allow employees to clock in manually if GPS verification fails (Not Recommended)."
            roles={["None (Strict GPS)"]}
            warning
          />
          <ConstraintCard
            title="Device Authorization"
            desc="Require administrator approval for every new device used by an employee."
            roles={["Super Admin"]}
          />
        </div>
      </section>

      <footer className="pt-6 border-t border-stroke dark:border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Info size={16} className="text-indigo-600" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Changes apply instantly to all active sessions after approval.</span>
        </div>
        <div className="flex items-center gap-4">
          {success && <span className="text-emerald-600 text-sm font-bold flex items-center gap-2 animate-fadeUp"><Check size={16} /> Permissions Updated!</span>}
          <Button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2">
            {saving ? <RefreshCcw size={16} className="animate-spin" /> : <Lock size={16} />}
            Approve & Save Changes
          </Button>
        </div>
      </footer>
    </div>
  )
}

function PermissionBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${active
          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10"
          : "bg-bg dark:bg-slate-950/40 text-slate-400 dark:text-slate-600 border-stroke dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        }`}
    >
      {icon}
      {label}
    </button>
  )
}

function ConstraintCard({ title, desc, roles, warning }) {
  return (
    <div className={`p-6 rounded-3xl border transition-all ${warning ? 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/30' : 'bg-surface2 dark:bg-slate-950/20 border-stroke dark:border-slate-800'}`}>
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{title}</h4>
        {warning && <Pill tone="warn">Critical</Pill>}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed mb-6">{desc}</p>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Active For:</span>
        {roles.map(r => (
          <span key={r} className="px-2 py-1 rounded-lg bg-bg dark:bg-slate-900 border border-stroke dark:border-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}
