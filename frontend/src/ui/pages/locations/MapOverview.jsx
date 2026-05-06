/**
 * MapOverview.jsx
 *
 * Admin-only live operational map overview.
 * Shows ALL locations with color-coded markers:
 *   Green  → Active, no issues
 *   Gray   → Inactive
 *   Red    → Alert (0 employees assigned but location active)
 *   Orange → Has employees on site
 *
 * Refreshes every 60 seconds for live employee-on-site counts.
 */
import React, { useState, useEffect, useCallback } from "react"
import { MapContainer, TileLayer, useMap, Circle, Polygon, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { RefreshCw, Users, MapPin, AlertTriangle, Activity } from "lucide-react"
import { apiRequest } from "../../../api/client.js"

// ── Colour logic ──────────────────────────────────────────────────────────────
function markerColor(loc) {
  if (!loc.is_active)      return "#94A3B8"  // gray — inactive
  if (loc.on_site_count > 0) return "#F97316" // orange — employees on site
  if (loc.employee_count === 0) return "#EF4444" // red — no employees assigned
  return "#22C55E"                             // green — active & assigned
}

function markerLabel(loc) {
  if (!loc.is_active)      return "Inactive"
  if (loc.on_site_count > 0) return `${loc.on_site_count} on site`
  if (loc.employee_count === 0) return "No assignments"
  return "Active"
}

// ── Imperative marker layer ───────────────────────────────────────────────────
function OverviewMarkers({ locations, onSelect }) {
  const map = useMap()

  useEffect(() => {
    const markers = []

    locations.forEach((loc) => {
      const color = markerColor(loc)
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          position:relative;
          width:36px;height:36px;
          background:${color};
          border:3px solid white;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 4px 12px rgba(0,0,0,0.25);
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="width:10px;height:10px;background:white;border-radius:50%;transform:rotate(45deg)"></div>
          ${loc.on_site_count > 0 ? `<div style="
            position:absolute;top:-6px;right:-6px;transform:rotate(45deg);
            background:#1e1b4b;color:white;font-size:9px;font-weight:800;
            min-width:16px;height:16px;border-radius:99px;
            display:flex;align-items:center;justify-content:center;padding:0 3px;
          ">${loc.on_site_count}</div>` : ""}
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -38],
      })

      const onSiteHtml = loc.on_site_employees?.length
        ? `<div style="margin-top:8px">
            <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px">ON SITE NOW</div>
            ${loc.on_site_employees.slice(0,5).map(n => `
              <div style="font-size:12px;color:#1e293b;padding:2px 0">${n}</div>
            `).join("")}
            ${loc.on_site_employees.length > 5 ? `<div style="font-size:11px;color:#94a3b8">+${loc.on_site_employees.length - 5} more</div>` : ""}
           </div>`
        : ""

      const marker = L.marker([loc.lat, loc.lng], { icon })
        .bindPopup(`
          <div style="min-width:200px;font-family:system-ui,sans-serif;padding:2px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
              <div style="font-weight:800;font-size:14px;color:#0f172a">${loc.name}</div>
            </div>
            <div style="font-size:12px;color:#64748b;margin-bottom:8px">${loc.address || "No address"}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
              <div style="background:#f8fafc;padding:6px 8px;border-radius:6px">
                <div style="font-size:10px;color:#94a3b8;font-weight:600">ASSIGNED</div>
                <div style="font-size:16px;font-weight:800;color:#0f172a">${loc.employee_count}</div>
              </div>
              <div style="background:#f8fafc;padding:6px 8px;border-radius:6px">
                <div style="font-size:10px;color:#94a3b8;font-weight:600">ON SITE</div>
                <div style="font-size:16px;font-weight:800;color:${color}">${loc.on_site_count}</div>
              </div>
            </div>
            ${onSiteHtml}
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;text-transform:capitalize">
              ${loc.location_type?.replace("_", " ") || "Location"} · ${markerLabel(loc)}
            </div>
          </div>
        `, { maxWidth: 260 })
        .on("click", () => onSelect?.(loc))

      marker.addTo(map)
      markers.push(marker)

      // Draw geofence
      if (loc.geofence_polygon) {
        try {
          const geom = typeof loc.geofence_polygon === "string"
            ? JSON.parse(loc.geofence_polygon)
            : loc.geofence_polygon
          const ring = geom.coordinates?.[0]
          if (ring) {
            const positions = ring.map(([lng, lat]) => [lat, lng])
            const poly = L.polygon(positions, {
              color, fillColor: color, fillOpacity: 0.08, weight: 1.5
            }).addTo(map)
            markers.push(poly)
          }
        } catch { /* skip */ }
      } else {
        const circle = L.circle([loc.lat, loc.lng], {
          radius: loc.geofence_radius || 300,
          color, fillColor: color, fillOpacity: 0.06, weight: 1
        }).addTo(map)
        markers.push(circle)
      }
    })

    return () => markers.forEach((m) => m.remove())
  }, [map, locations, onSelect])

  return null
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ locations }) {
  const total    = locations.length
  const active   = locations.filter(l => l.is_active).length
  const onSite   = locations.reduce((s, l) => s + (l.on_site_count || 0), 0)
  const alerts   = locations.filter(l => l.is_active && l.employee_count === 0).length

  const stat = (icon, label, val, color) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 16px", background: "var(--surface)",
      borderRadius: 10, border: "1px solid var(--stroke)", flex: 1,
    }}>
      <div style={{ color, opacity: 0.8 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", lineHeight: 1 }}>{val}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )

  return (
    <div style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--stroke)" }}>
      {stat(<MapPin size={18} />, "Total Sites", total, "#4F46E5")}
      {stat(<Activity size={18} />, "Active", active, "#22C55E")}
      {stat(<Users size={18} />, "On Site Now", onSite, "#F97316")}
      {stat(<AlertTriangle size={18} />, "Alerts", alerts, "#EF4444")}
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { color: "#22C55E", label: "Active — assigned" },
    { color: "#F97316", label: "Employees on site" },
    { color: "#EF4444", label: "Alert — no assignments" },
    { color: "#94A3B8", label: "Inactive" },
  ]
  return (
    <div style={{
      position: "absolute", bottom: 16, left: 16, zIndex: 1000,
      background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
      borderRadius: 10, padding: "10px 14px", border: "1px solid var(--stroke)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    }}>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function MapOverview() {
  const [locations, setLocations] = useState([])
  const [loading, setLoading]     = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [selected, setSelected]   = useState(null)
  const [filterZone, setFilterZone] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  const load = useCallback(async () => {
    try {
      const data = await apiRequest("/time/locations/overview/")
      setLocations(Array.isArray(data) ? data : [])
      setLastUpdated(new Date())
    } catch {
      setLocations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000) // refresh every minute
    return () => clearInterval(interval)
  }, [load])

  const filtered = locations.filter((loc) => {
    if (filterStatus === "active"   && !loc.is_active) return false
    if (filterStatus === "inactive" &&  loc.is_active) return false
    if (filterStatus === "onsite"   && loc.on_site_count === 0) return false
    if (filterStatus === "alerts"   && (loc.employee_count > 0 || !loc.is_active)) return false
    return true
  })

  const mapCenter = filtered.length > 0
    ? [filtered[0].lat, filtered[0].lng]
    : [20.5937, 78.9629]

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Stats */}
      <StatsBar locations={locations} />

      {/* Filter bar */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 16px", alignItems: "center",
        borderBottom: "1px solid var(--stroke)", flexWrap: "wrap",
      }}>
        {[
          { val: "all",      label: "All Sites" },
          { val: "active",   label: "Active" },
          { val: "onsite",   label: "On Site" },
          { val: "alerts",   label: "Alerts" },
          { val: "inactive", label: "Inactive" },
        ].map(({ val, label }) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            style={{
              padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
              border: "1px solid var(--stroke)", cursor: "pointer",
              background: filterStatus === val ? "#4F46E5" : "transparent",
              color: filterStatus === val ? "#fff" : "var(--fg2)",
            }}>
            {label}
          </button>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={load} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 10px", borderRadius: 8,
            border: "1px solid var(--stroke)", background: "transparent",
            fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--fg2)",
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        {loading ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Loading overview…</div>
            </div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={filtered.length === 1 ? 14 : 5}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <OverviewMarkers locations={filtered} onSelect={setSelected} />
            <Legend />
          </MapContainer>
        )}
      </div>
    </div>
  )
}
