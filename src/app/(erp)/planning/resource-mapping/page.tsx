export const dynamic = "force-dynamic";

import { db } from "@/db";
import { taskAssignments, projectUnits, subcontractors, projects, resourceForecasts } from "@/db/schema";
import { phaseScopes } from "@/db/schema/phases";
import { eq, sql } from "drizzle-orm";
import { GenerateForecastsButton } from "./GenerateForecastsButton";

const ACCENT = "#1a56db";

export default async function ResourceMappingPage() {
  const forecastCounts = db
    .select({
      unitId: resourceForecasts.unitId,
      cnt: sql<number>`count(*)`.as("cnt"),
    })
    .from(resourceForecasts)
    .groupBy(resourceForecasts.unitId)
    .as("forecast_counts");

  const ntps = await db
    .select({
      id:        taskAssignments.id,
      unitId:    taskAssignments.unitId,
      category:  taskAssignments.category,
      unitCode:  projectUnits.unitCode,
      unitModel: projectUnits.unitModel,
      projName:  projects.name,
      subName:   subcontractors.name,
      scopeName: phaseScopes.name,
      forecastCnt: forecastCounts.cnt,
    })
    .from(taskAssignments)
    .leftJoin(projectUnits,    eq(taskAssignments.unitId, projectUnits.id))
    .leftJoin(projects,        eq(taskAssignments.projectId, projects.id))
    .leftJoin(subcontractors,  eq(taskAssignments.subconId, subcontractors.id))
    .leftJoin(phaseScopes,     eq(taskAssignments.phaseScopeId, phaseScopes.id))
    .leftJoin(forecastCounts,  eq(forecastCounts.unitId, taskAssignments.unitId))
    .where(eq(taskAssignments.status, "ACTIVE"))
    .orderBy(projects.name, projectUnits.unitCode);

  const missing = ntps.filter((n) => !n.forecastCnt || Number(n.forecastCnt) === 0);
  const covered = ntps.filter((n) => n.forecastCnt && Number(n.forecastCnt) > 0);

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  };

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <p style={{ marginBottom: "0.25rem" }}>
          <a href="/planning" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Planning &amp; Engineering</a>
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: "0 0 0.25rem" }}>Resource Mapping — Generate Forecasts</h1>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: 0, marginBottom: "1.5rem" }}>
          Active NTPs and whether resource forecasts (MRP / Batching) have been generated from approved BOM entries.
        </p>

        {missing.length > 0 && (
          <div style={{ ...card, marginBottom: "1.5rem", border: "1px solid #fde68a", background: "#fffbeb" }}>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", fontWeight: 700, color: "#92400e" }}>
              ⚠ {missing.length} active NTP{missing.length > 1 ? "s are" : " is"} missing resource forecasts
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {missing.map((n) => (
                <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "#fff", borderRadius: "8px", border: "1px solid #fde68a", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.9rem" }}>
                      {n.projName} — {n.unitCode} ({n.unitModel})
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                      {n.subName ?? "—"} · {n.scopeName ?? n.category}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <a href={`/construction/ntp/${n.id}`} style={{ fontSize: "0.78rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>View NTP</a>
                    <GenerateForecastsButton ntpId={n.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={card}>
          <p style={{ margin: "0 0 1rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>
            Forecasts Generated ({covered.length})
          </p>
          {covered.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: 0 }}>No active NTPs with forecasts yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {covered.map((n) => (
                <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.85rem", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0", fontSize: "0.85rem" }}>
                  <span>
                    <strong>{n.projName}</strong> — {n.unitCode} ({n.unitModel}) · {n.scopeName ?? n.category}
                  </span>
                  <a href={`/construction/ntp/${n.id}`} style={{ color: "#166534", textDecoration: "none", fontWeight: 600, fontSize: "0.78rem" }}>View →</a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
