import { useState } from "react"
import { Sun, Moon, Monitor, Check, Type, Layers, Save } from "lucide-react"
import { loadPrefs, savePrefs, applyTheme, applyAccent, applyFontSize } from "../../theme.js"

const THEMES = [
  { key: "light", label: "Light", icon: <Sun size={18} />, preview: { bg: "#F6F8FA", surface: "#FFFFFF", fg: "#0E1116" } },
  { key: "dark", label: "Dark", icon: <Moon size={18} />, preview: { bg: "#0E1116", surface: "#1A1D23", fg: "#F1F5F9" } },
  { key: "system", label: "System", icon: <Monitor size={18} />, preview: { bg: "linear-gradient(135deg, #F6F8FA 50%, #0E1116 50%)", surface: "#888", fg: "#888" } },
]

const ACCENT_COLORS = [
  { key: "indigo", label: "Indigo", value: "#1A56DB" },
  { key: "violet", label: "Violet", value: "#7C3AED" },
  { key: "emerald", label: "Emerald", value: "#059669" },
  { key: "rose", label: "Rose", value: "#E11D48" },
  { key: "amber", label: "Amber", value: "#D97706" },
  { key: "cyan", label: "Cyan", value: "#0891B2" },
  { key: "slate", label: "Slate", value: "#475569" },
  { key: "orange", label: "Orange", value: "#EA580C" },
]

const DENSITIES = [
  { key: "compact", label: "Compact", desc: "More content visible, tighter spacing.", lines: [2, 4, 6, 8] },
  { key: "comfortable", label: "Comfortable", desc: "Balanced layout for everyday use.", lines: [3, 6, 9] },
  { key: "spacious", label: "Spacious", desc: "More breathing room between elements.", lines: [4, 8] },
]

const FONT_SIZES = [
  { key: "sm", label: "Small", px: 12 },
  { key: "md", label: "Medium", px: 14 },
  { key: "lg", label: "Large", px: 16 },
  { key: "xl", label: "Extra Large", px: 18 },
]


export default function AppearanceSection({ showToast, SectionHeader }) {
  const [prefs, setPrefs] = useState(() => ({
    theme: "system",
    accent: "indigo",
    density: "comfortable",
    fontSize: "md",
    ...loadPrefs(),
  }))
  const [saved, setSaved] = useState(false)

  const update = (key, value) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value }
      if (key === "theme") applyTheme(value)
      if (key === "accent") {
        const clr = ACCENT_COLORS.find(c => c.key === value)?.value
        if (clr) applyAccent(clr)
      }
      if (key === "fontSize") applyFontSize(value)
      savePrefs(next)
      return next
    })
  }

  const handleSave = () => {
    savePrefs(prefs)
    setSaved(true)
    showToast("Appearance preferences saved.")
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="stPanel">
      <SectionHeader title="Appearance" subtitle="Customize the look and feel of your QuickTIMS workspace." />

      {/* Theme */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Sun size={15} style={{ color: "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Color mode</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {THEMES.map(theme => (
            <button
              key={theme.key}
              onClick={() => update("theme", theme.key)}
              style={{
                border: prefs.theme === theme.key ? "2px solid #1A56DB" : "1px solid var(--stroke2)",
                borderRadius: 12, padding: 0, cursor: "pointer", background: "none",
                overflow: "hidden", transition: "all .2s",
              }}
            >
              {/* Mini preview */}
              <div style={{
                height: 80, background: typeof theme.preview.bg === "string" && theme.preview.bg.startsWith("linear") ? theme.preview.bg : theme.preview.bg,
                position: "relative", overflow: "hidden",
              }}>
                {theme.key !== "system" && (
                  <>
                    <div style={{ position: "absolute", top: 10, left: 10, right: 10, height: 12, borderRadius: 4, background: theme.preview.surface, opacity: 0.9 }} />
                    <div style={{ position: "absolute", top: 28, left: 10, width: "60%", height: 8, borderRadius: 4, background: theme.preview.fg, opacity: 0.15 }} />
                    <div style={{ position: "absolute", top: 40, left: 10, width: "40%", height: 8, borderRadius: 4, background: theme.preview.fg, opacity: 0.1 }} />
                  </>
                )}
              </div>
              <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
                  {theme.icon} {theme.label}
                </div>
                {prefs.theme === theme.key && <Check size={14} style={{ color: "#1A56DB" }} />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ width: 15, height: 15, borderRadius: 4, background: ACCENT_COLORS.find(c => c.key === prefs.accent)?.value || "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Accent color</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {ACCENT_COLORS.map(color => (
            <button
              key={color.key}
              onClick={() => update("accent", color.key)}
              title={color.label}
              style={{
                width: 36, height: 36, borderRadius: "50%", background: color.value,
                border: prefs.accent === color.key ? `3px solid ${color.value}` : "2px solid transparent",
                outline: prefs.accent === color.key ? `2px solid ${color.value}44` : "none",
                outlineOffset: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .15s",
              }}
            >
              {prefs.accent === color.key && <Check size={14} style={{ color: "#fff" }} />}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
          Selected: <strong style={{ color: ACCENT_COLORS.find(c => c.key === prefs.accent)?.value }}>{ACCENT_COLORS.find(c => c.key === prefs.accent)?.label}</strong>
        </div>
      </div>

      {/* Density */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Layers size={15} style={{ color: "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Layout density</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {DENSITIES.map(density => (
            <button
              key={density.key}
              onClick={() => update("density", density.key)}
              style={{
                border: prefs.density === density.key ? "2px solid #1A56DB" : "1px solid var(--stroke2)",
                borderRadius: 12, padding: 16, cursor: "pointer", background: prefs.density === density.key ? "#EFF4FF" : "var(--surface2)",
                textAlign: "left", transition: "all .15s",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: density.key === "compact" ? 3 : density.key === "comfortable" ? 5 : 8, marginBottom: 12 }}>
                {density.lines.map((w, i) => (
                  <div key={i} style={{ height: 3, borderRadius: 2, width: `${w * 10}%`, background: prefs.density === density.key ? "#1A56DB" : "var(--stroke2)" }} />
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {density.label}
                {prefs.density === density.key && <Check size={12} style={{ color: "#1A56DB" }} />}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{density.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div className="stCard">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Type size={15} style={{ color: "#1A56DB" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>Font size</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {FONT_SIZES.map(size => (
            <button
              key={size.key}
              onClick={() => update("fontSize", size.key)}
              style={{
                border: prefs.fontSize === size.key ? "2px solid #1A56DB" : "1px solid var(--stroke2)",
                borderRadius: 10, padding: "14px 12px", cursor: "pointer",
                background: prefs.fontSize === size.key ? "#EFF4FF" : "var(--surface2)",
                textAlign: "center", transition: "all .15s",
              }}
            >
              <div style={{ fontSize: size.px, fontWeight: 800, color: prefs.fontSize === size.key ? "#1A56DB" : "var(--fg)", marginBottom: 4, lineHeight: 1 }}>Aa</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: prefs.fontSize === size.key ? "#1A56DB" : "var(--muted)" }}>{size.label}</div>
              <div style={{ fontSize: 10, color: "var(--subtle)", marginTop: 2 }}>{size.px}px</div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="stCard" style={{ background: "var(--bg2)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Preview</div>
        <div style={{ background: "var(--surface)", borderRadius: 10, padding: 16, border: "1px solid var(--stroke2)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--fg)", marginBottom: 6 }}>Dashboard</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>Your workspace overview and quick actions.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ padding: "7px 14px", borderRadius: 8, background: ACCENT_COLORS.find(c => c.key === prefs.accent)?.value || "#1A56DB", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "default" }}>
              Primary Button
            </button>
            <button style={{ padding: "7px 14px", borderRadius: 8, background: "transparent", color: "var(--fg)", border: "1px solid var(--stroke2)", fontSize: 12, fontWeight: 600, cursor: "default" }}>
              Ghost Button
            </button>
          </div>
        </div>
      </div>

      <div>
        <button className="stPrimaryBtn" onClick={handleSave}>
          {saved ? <Check size={13} /> : <Save size={13} />}
          {saved ? "Saved!" : "Save appearance"}
        </button>
      </div>
    </div>
  )
}
