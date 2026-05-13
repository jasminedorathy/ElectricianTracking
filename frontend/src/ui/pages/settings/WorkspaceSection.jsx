import { useState, useEffect, useRef } from "react"
import {
  Building2, Globe, MapPin, Upload, Save,
  Loader2, Image as ImageIcon, Check,
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { useAuth } from "../../../state/auth/useAuth.js"

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Sao_Paulo", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "Europe/Moscow", "Asia/Dubai", "Asia/Kolkata", "Asia/Colombo",
  "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai",
  "Australia/Sydney", "Pacific/Auckland",
]

const DATA_REGIONS = [
  { value: "us-east", label: "United States (East)" },
  { value: "us-west", label: "United States (West)" },
  { value: "eu-central", label: "Europe (Frankfurt)" },
  { value: "ap-south", label: "Asia Pacific (Mumbai)" },
  { value: "ap-southeast", label: "Asia Pacific (Singapore)" },
]

const INDUSTRIES = [
  "Technology", "Healthcare", "Finance & Banking", "Retail & E-commerce",
  "Manufacturing", "Education", "Construction", "Transportation & Logistics",
  "Hospitality & Tourism", "Media & Entertainment", "Legal & Professional Services",
  "Government & Public Sector", "Non-profit", "Other",
]

export default function WorkspaceSection({ showToast, SectionHeader }) {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const logoRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    company_name: "",
    slug: "",
    industry: "",
    website: "",
    timezone: "UTC",
    data_region: "us-east",
    address: "",
    country: "",
  })
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    apiRequest("/company/me")
      .then(res => {
        if (res) {
          setForm(prev => ({
            ...prev,
            company_name: res.company_name || "",
            slug: res.schema_name || "",
            timezone: res.timezone || "UTC",
            industry: res.industry || "",
            website: res.website || "",
            address: res.address || "",
            country: res.primary_country || "",
          }))
          if (res.logo_url) setLogoPreview(res.logo_url)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogoFile = file => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showToast("Logo must be under 2 MB.", "error"); return }
    if (!file.type.startsWith("image/")) { showToast("Please select an image file.", "error"); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!form.company_name.trim()) { showToast("Organization name is required.", "error"); return }
    setSaving(true)
    try {
      const body = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) body.append(k, v) })
      if (logoFile) body.append("logo", logoFile)
      await apiRequest("/company/update", { method: "PUT", body })
      showToast("Workspace settings saved.")
      setLogoFile(null)
    } catch (err) {
      showToast(err?.body?.message || "Failed to save workspace settings.", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  if (loading) return (
    <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
      <Loader2 size={24} style={{ animation: "spin .7s linear infinite" }} />
    </div>
  )

  return (
    <div className="stPanel">
      <SectionHeader title="Workspace" subtitle="Manage your organization's identity, settings, and data preferences." />

      {!isAdmin && (
        <div style={{ padding: 14, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, marginBottom: 4, fontSize: 12, color: "#92400E", display: "flex", gap: 10 }}>
          <span>⚠</span>
          <span>You are viewing workspace settings. Only admins can make changes.</span>
        </div>
      )}

      {/* Organization Identity */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Building2 size={15} style={{ color: "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Organization identity</span>
        </div>
        <div className="stFormGrid">
          <Field label="Organization name" half>
            <input
              className="stInput"
              value={form.company_name}
              placeholder="Acme Corp"
              disabled={!isAdmin}
              onChange={e => handleChange("company_name", e.target.value)}
            />
          </Field>
          <Field label="URL slug" half>
            <div className="stInputAddon">
              <span className="stInputAddonPrefix">quicktims.com/</span>
              <input
                className="stInput stInputAddonField"
                value={form.slug}
                placeholder="acme-corp"
                disabled
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>
          </Field>
          <Field label="Industry" half>
            <select
              className="stInput stSelect"
              value={form.industry}
              disabled={!isAdmin}
              onChange={e => handleChange("industry", e.target.value)}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Website" half>
            <div className="stInputAddon">
              <span className="stInputAddonPrefix"><Globe size={12} /></span>
              <input
                className="stInput stInputAddonField"
                placeholder="https://company.com"
                value={form.website}
                disabled={!isAdmin}
                onChange={e => handleChange("website", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Office address">
            <textarea
              className="stInput stTextarea"
              placeholder="123 Main St, City, State, ZIP"
              value={form.address}
              disabled={!isAdmin}
              onChange={e => handleChange("address", e.target.value)}
              rows={2}
            />
          </Field>
        </div>
      </div>

      {/* Logo */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <ImageIcon size={15} style={{ color: "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Organization logo</span>
        </div>
        <div className="stLogoGrid">
          <div
            className={`stDropZone ${logoPreview ? "has" : ""} ${dragOver ? "drag" : ""}`}
            onClick={() => isAdmin && logoRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); if (isAdmin) handleLogoFile(e.dataTransfer.files[0]) }}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="stDropPreview" />
            ) : (
              <>
                <Upload size={28} className="stDropIcon" />
                <div className="stDropText">Upload logo</div>
                <div className="stDropSub">PNG, SVG, or JPG · Max 2 MB</div>
              </>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: 16, background: "var(--bg2)", borderRadius: 10, fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>Logo guidelines</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {["Minimum 200 × 200 px", "Transparent background preferred", "PNG or SVG for best quality", "Maximum 2 MB file size"].map(g => (
                  <li key={g} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <Check size={11} style={{ color: "#059669", flexShrink: 0, marginTop: 2 }} /> {g}
                  </li>
                ))}
              </ul>
            </div>
            {isAdmin && (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="stGhostBtn" style={{ fontSize: 12 }} onClick={() => logoRef.current?.click()}>
                  <Upload size={12} /> Choose file
                </button>
                {logoPreview && (
                  <button className="stDangerBtn" onClick={() => { setLogoPreview(null); setLogoFile(null) }}>
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleLogoFile(e.target.files?.[0])} />
      </div>

      {/* Regional Settings */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Globe size={15} style={{ color: "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Regional settings</span>
        </div>
        <div className="stFormGrid">
          <Field label="Default timezone" half>
            <div style={{ position: "relative" }}>
              <Globe size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
              <select
                className="stInput stSelect"
                style={{ paddingLeft: 30 }}
                value={form.timezone}
                disabled={!isAdmin}
                onChange={e => handleChange("timezone", e.target.value)}
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Data region" half>
            <div style={{ position: "relative" }}>
              <MapPin size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
              <select
                className="stInput stSelect"
                style={{ paddingLeft: 30 }}
                value={form.data_region}
                disabled={!isAdmin}
                onChange={e => handleChange("data_region", e.target.value)}
              >
                {DATA_REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </Field>
        </div>
        <div style={{ marginTop: 12, padding: 12, background: "#F0F9FF", borderRadius: 8, fontSize: 12, color: "#0369A1", border: "1px solid #BAE6FD" }}>
          ⓘ Data region determines where your organization data is stored. Changing this requires a data migration and cannot be done self-serve.
        </div>
      </div>

      {isAdmin && (
        <div>
          <button className="stPrimaryBtn" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Save size={13} />}
            {saving ? "Saving..." : "Save workspace settings"}
          </button>
        </div>
      )}
    </div>
  )
}

function Field({ label, children, half }) {
  return (
    <div style={{ gridColumn: half ? undefined : "1 / -1" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}
