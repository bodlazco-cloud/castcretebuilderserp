export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  masterBomEntries,
  resourceForecasts,
  planningVarianceRequests,
  materials,
  projects,
} from "@/db/schema";
import { phaseActivities } from "@/db/schema/phases";
import { eq, desc, count } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:          { bg: "#f3f4f6", color: "#6b7280",  label: "Draft" },
  PENDING_REVIEW: { bg: "#fef9c3", color: "#713f12",  label: "Pending Review" },
  APPROVED:       { bg: "#dcfce7", color: "#166534",  label: "Approved" },
  REJECTED:       { bg: "#fef2f2", color: "#b91c1c",  label: "Rejected" },
};

function BomStatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { bg: "#f3f4f6", color: "#6b7280", label: status };
  return (
    <span style={{
      display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px",
      fontSize: "0.72rem", fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

export default async function PlanningOverviewPage() {
  const [
    bomByStatus,
    forecastByType,
    forecastByStatus,
    varianceByStatus,
    recentBomEntries,
    projectList,
    unitCount,
  ] = await Promise.all([
    safe(
      db
        .select({ status: masterBomEntries.status, cnt: count() })
        .from(masterBomEntries)
        .where(eq(masterBomEntries.isActive, true))
        .groupBy(masterBomEntries.status),
      [] as { status: string; cnt: number }[],
    ),
    safe(
      db
        .select({ forecastType: resourceForecasts.forecastType, cnt: count() })
        .from(resourceForecasts)
        .groupBy(resourceForecasts.forecastType),
      [] as { forecastType: string; cnt: number }[],
    ),
    safe(
      db
        .select({ status: resourceForecasts.status, cnt: count() })
        .from(resourceForecasts)
        .groupBy(resourceForecasts.status),
      [] as { status: string; cnt: number }[],
    ),
    safe(
      db
        .select({ status: planningVarianceRequests.status, cnt: count() })
        .from(planningVarianceRequests)
        .groupBy(planningVarianceRequests.status),
      [] as { status: string; cnt: number }[],
    ),
    safe(
      db
        .select({
          id:              masterBomEntries.id,
          unitModel:       masterBomEntries.unitModel,
          unitType:        masterBomEntries.unitType,
          status:          masterBomEntries.status,
          quantityPerUnit: masterBomEntries.quantityPerUnit,
          createdAt:       masterBomEntries.createdAt,
          matName:         materials.name,
          matUnit:         materials.unit,
          actCode:         phaseActivities.code,
          actName:         phaseActivities.name,
        })
        .from(masterBomEntries)
        .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
        .leftJoin(phaseActivities, eq(masterBomEntries.phaseActivityId, phaseActivities.id))
        .where(eq(masterBomEntries.isActive, true))
        .orderBy(desc(masterBomEntries.createdAt))
        .limit(5),
      [] as {
        id: string; unitModel: string; unitType: string; status: string;
        quantityPerUnit: string; createdAt: Date; matName: string | null;
        matUnit: string | null; actCode: string | null; actName: string | null;
      }[],
    ),
    safe(
      db
        .select({ id: projects.id, name: projects.name, status: projects.status })
        .from(projects)
        .orderBy(projects.name),
      [] as { id: string; name: string; status: string }[],
    ),
    safe(
      db
        .select({ cnt: count() })
        .from(resourceForecasts)
        .groupBy(resourceForecasts.forecastType)
        .then((rows) => rows.reduce((sum, r) => sum + Number(r.cnt), 0)),
      0,
    ),
  ]);

  const bomStatusMap      = Object.fromEntries(bomByStatus.map((r) => [r.status, Number(r.cnt)]));
  const forecastTypeMap   = Object.fromEntries(forecastByType.map((r) => [r.forecastType, Number(r.cnt)]));
  const forecastStatusMap = Object.fromEntries(forecastByStatus.map((r) => [r.status, Number(r.cnt)]));
  const varianceStatusMap = Object.fromEntries(varianceByStatus.map((r) => [r.status, Number(r.cnt)]));

  const approvedBom   = bomStatusMap["APPROVED"]       ?? 0;
  const pendingBom    = bomStatusMap["PENDING_REVIEW"]  ?? 0;
  const draftBom      = bomStatusMap["DRAFT"]           ?? 0;
  const rejectedBom   = bomStatusMap["REJECTED"]        ?? 0;
  const totalBomLines = approvedBom + pendingBom + draftBom + rejectedBom;

  const mrpQueue      = forecastTypeMap["MATERIAL"]  ?? 0;
  const concreteQueue = forecastTypeMap["CONCRETE"]  ?? 0;
  const equipQueue    = forecastTypeMap["EQUIPMENT"] ?? 0;

  const pendingPr     = forecastStatusMap["PENDING_PR"] ?? 0;
  const prCreated     = forecastStatusMap["PR_CREATED"] ?? 0;
  const poIssued      = forecastStatusMap["PO_ISSUED"]  ?? 0;
  const issued        = forecastStatusMap["ISSUED"]     ?? 0;
  const totalForecast = pendingPr + prCreated + poIssued + issued;

  const pendingVariances  = varianceStatusMap["PENDING_REVIEW"] ?? 0;
  const approvedVariances = varianceStatusMap["APPROVED"]       ?? 0;
  const draftVariances    = varianceStatusMap["DRAFT"]          ?? 0;
  const totalVariances    = Object.values(varianceStatusMap).reduce((s, v) => s + v, 0);

  const kpis = [
    { label: "Approved BOM Lines", value: approvedBom,      sub: `${totalBomLines} total active`,        accent: "#057a55" },
    { label: "MRP Queue Items",    value: mrpQueue,          sub: `${pendingPr} pending PR`,              accent: "#1a56db" },
    { label: "Pending Variances",  value: pendingVariances,  sub: `${totalVariances} total requests`,     accent: "#e3a008" },
    { label: "Units Forecasted",   value: unitCount,         sub: `${concreteQueue} concrete · ${equipQueue} equip`, accent: "#7e3af2" },
  ];

  const forecastPipelineTotal = Math.max(totalForecast, 1);
  const pipelineStages = [
    { label: "Pending PR", count: pendingPr, pct: Math.round((pendingPr / forecastPipelineTotal) * 100), color: "#fca5a5", text: "#b91c1c" },
    { label: "PR Created", count: prCreated, pct: Math.round((prCreated / forecastPipelineTotal) * 100), color: "#fde68a", text: "#92400e" },
    { label: "PO Issued",  count: poIssued,  pct: Math.round((poIssued  / forecastPipelineTotal) * 100), color: "#93c5fd", text: "#1e40af" },
    { label: "Issued",     count: issued,    pct: Math.round((issued    / forecastPipelineTotal) * 100), color: "#86efac", text: "#166534" },
  ];

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  };

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div>
            <p style={{ marginBottom: "0.25rem" }}>
              <a href="/main-dashboard" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>
                ← Dashboard
              </a>
            </p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Planning &amp; Engineering</h1>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
              Master BOM, Resource Forecasts &amp; Variance Tracking
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <a href="/planning/bom/new" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", border: "1px solid #1a56db",
              color: "#1a56db", background: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>+ BOM Entry</a>
            <a href="/planning/variance-requests/new" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#1a56db",
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>+ Variance Request</a>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{ ...card, borderTop: `3px solid ${kpi.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                {kpi.value.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* BOM Status + Forecast Pipeline */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>

          {/* BOM Status Breakdown */}
          <div style={card}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "0.75rem", marginTop: 0 }}>
              BOM Status Breakdown
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {[
                { label: "Draft",          count: draftBom,    bg: "#f3f4f6", color: "#374151" },
                { label: "Pending Review", count: pendingBom,  bg: "#fef9c3", color: "#713f12" },
                { label: "Approved",       count: approvedBom, bg: "#dcfce7", color: "#166534" },
                { label: "Rejected",       count: rejectedBom, bg: "#fef2f2", color: "#b91c1c" },
              ].map((s) => (
                <div key={s.label} style={{ background: s.bg, borderRadius: "8px", padding: "1rem" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color, lineHeight: 1 }}>
                    {s.count.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#6b7280" }}>
              <span>{totalBomLines} active BOM lines</span>
              <a href="/planning/bom" style={{ color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>View register →</a>
            </div>
          </div>

          {/* Forecast Pipeline */}
          <div style={card}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "0.75rem", marginTop: 0 }}>
              Resource Forecast Pipeline
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {pipelineStages.map((stage) => (
                <div key={stage.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ color: "#374151" }}>{stage.label}</span>
                    <span style={{ color: "#6b7280", fontFamily: "monospace" }}>{stage.count} · {stage.pct}%</span>
                  </div>
                  <div style={{ height: "8px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: stage.color, borderRadius: "999px", width: `${stage.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb", fontSize: "0.75rem", color: "#6b7280" }}>
              {totalForecast} total forecast lines across all projects
            </div>
          </div>
        </div>

        {/* MRP / Concrete / Equipment Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { title: "Material Requirements (MRP)", count: mrpQueue,      stat: `${pendingPr} pending procurement`, link: "/planning/mrp-queue",          linkLabel: "Open MRP Queue →",  accent: "#1a56db" },
            { title: "Concrete Forecast",           count: concreteQueue, stat: "Batching schedule lines",          link: "/planning/batching-forecast",    linkLabel: "View Batching →",   accent: "#e3a008" },
            { title: "Equipment Needs",             count: equipQueue,    stat: "Motorpool demand lines",           link: "/planning/motorpool-needs",      linkLabel: "View Motorpool →",  accent: "#0694a2" },
          ].map((c) => (
            <div key={c.title} style={{ ...card, borderTop: `3px solid ${c.accent}` }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", margin: "0 0 0.5rem" }}>{c.title}</p>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{c.count.toLocaleString()}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>{c.stat}</div>
              <a href={c.link} style={{ display: "inline-block", marginTop: "0.75rem", fontSize: "0.8rem", color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>
                {c.linkLabel}
              </a>
            </div>
          ))}
        </div>

        {/* Variance Summary */}
        <div style={{ ...card, marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", margin: 0 }}>
              Variance Request Summary
            </p>
            <a href="/planning/variance-requests" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>View All →</a>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {[
              { label: "Draft",          count: draftVariances,    bg: "#f3f4f6", color: "#374151" },
              { label: "Pending Review", count: pendingVariances,  bg: "#fef9c3", color: "#713f12" },
              { label: "Approved",       count: approvedVariances, bg: "#dcfce7", color: "#166534" },
              { label: "Total",          count: totalVariances,    bg: "#eff6ff", color: "#1e40af" },
            ].map((s) => (
              <div key={s.label} style={{ background: s.bg, borderRadius: "8px", padding: "0.75rem 1rem", minWidth: "100px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</div>
                <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.25rem" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent BOM Entries */}
        <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", margin: 0 }}>
              Recent BOM Entries
            </p>
            <a href="/planning/bom" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>View all →</a>
          </div>
          {recentBomEntries.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
              No BOM entries yet.{" "}
              <a href="/planning/bom/new" style={{ color: "#1a56db", textDecoration: "none" }}>Add first entry →</a>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Material", "Activity", "Unit Model / Type", "Qty / Unit", "Status", "Created"].map((h) => (
                      <th key={h} style={{
                        background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
                        fontSize: "0.75rem", fontWeight: 600, color: "#6b7280",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        padding: "0.75rem 1rem", textAlign: "left", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentBomEntries.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>
                        {row.matName ?? <span style={{ color: "#9ca3af" }}>—</span>}
                        {row.matUnit && <span style={{ color: "#6b7280", fontSize: "0.75rem", marginLeft: "0.25rem" }}>({row.matUnit})</span>}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151", fontSize: "0.875rem" }}>
                        {row.actCode && (
                          <span style={{ fontFamily: "monospace", background: "#eff6ff", color: "#1e40af", padding: "0.1rem 0.4rem", borderRadius: "4px", marginRight: "0.25rem", fontSize: "0.72rem" }}>
                            {row.actCode}
                          </span>
                        )}
                        {row.actName ?? "—"}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ color: "#111827", fontWeight: 600 }}>{row.unitModel}</span>
                        <span style={{ marginLeft: "0.5rem", fontSize: "0.72rem", fontWeight: 600, background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                          {row.unitType}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#374151", fontSize: "0.875rem" }}>
                        {Number(row.quantityPerUnit).toFixed(4)}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <BomStatusBadge status={row.status} />
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#9ca3af", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        {new Date(row.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Project Quick Links */}
        {projectList.length > 0 && (
          <div style={card}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "0.75rem", marginTop: 0 }}>
              Active Projects
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {projectList
                .filter((p) => p.status === "ACTIVE")
                .map((p) => (
                  <span key={p.id} style={{ padding: "0.35rem 0.75rem", background: "#f3f4f6", borderRadius: "6px", fontSize: "0.8rem", color: "#374151", fontWeight: 500 }}>
                    {p.name}
                  </span>
                ))}
              {projectList.filter((p) => p.status === "ACTIVE").length === 0 && (
                <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>No active projects.</span>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
