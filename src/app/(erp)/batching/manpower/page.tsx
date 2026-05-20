export const dynamic = "force-dynamic";

import { db } from "@/db";
import { projects, projectUnits } from "@/db/schema";

const ACCENT = "#1a56db";

export default async function PlantManpowerPage() {
  const [projectRows, unitRows] = await Promise.all([
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
    db.select({ id: projectUnits.id, unitCode: projectUnits.unitCode, projectId: projectUnits.projectId })
      .from(projectUnits)
      .orderBy(projectUnits.unitCode),
  ]);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Batching Plant</a>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Batching Plant
          </span>
          <h1 style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            Plant Manpower
          </h1>
          <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.875rem" }}>
            Daily workforce allocation across project sites.
          </p>
        </div>

        {/* Project / Site filter panel */}
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
            Filter by Project / Site
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>
                Project
              </label>
              <select style={{ width: "100%", padding: "0.5rem 0.65rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}>
                <option value="">All projects</option>
                {projectRows.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>
                Unit / Site
              </label>
              <select style={{ width: "100%", padding: "0.5rem 0.65rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}>
                <option value="">All units</option>
                {unitRows.map((u) => (
                  <option key={u.id} value={u.id}>{u.unitCode}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Placeholder — manpower log table */}
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
            <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Manpower Log</h2>
          </div>
          <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
            <div style={{ marginBottom: "0.5rem", fontSize: "1.5rem" }}>👷</div>
            Manpower log entries will appear here once daily headcount recording is configured.
            <div style={{ marginTop: "1rem" }}>
              <span style={{ padding: "0.4rem 0.85rem", background: "#eff6ff", color: ACCENT, borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600 }}>
                Feature: Daily Headcount Entry — coming soon
              </span>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: "1.25rem", padding: "0.85rem 1rem",
          background: "#eff6ff", borderRadius: "7px",
          borderLeft: `3px solid ${ACCENT}`,
          fontSize: "0.78rem", color: "#1e40af",
        }}>
          <strong>Project/Site Assignment:</strong> Each manpower entry will be tied to a specific project
          and unit/site, enabling accurate labor cost allocation per job cost center.
        </div>
      </div>
    </main>
  );
}
