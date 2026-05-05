export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  resourceForecasts, constructionManpowerLogs, equipment, equipmentAssignments,
  projects, activityDefinitions, subcontractors, materials, projectUnits, bomStandards,
} from "@/db/schema";
import { eq, desc, sum, count } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#1a56db";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING_PR: { bg: "#eff6ff", color: "#1a56db" },
  PR_CREATED: { bg: "#fef9c3", color: "#713f12" },
  PO_ISSUED:  { bg: "#f0fdf4", color: "#057a55" },
  ISSUED:     { bg: "#dcfce7", color: "#166534" },
};

export default async function ResourceForecastingPage() {
  await getAuthUser();

  const [bomRows, equipRows, manpowerRows] = await Promise.all([
    // BOM Forecasts from active NTPs
    db.select({
      id:           resourceForecasts.id,
      forecastQty:  resourceForecasts.forecastQty,
      actualQty:    resourceForecasts.actualIssuedQty,
      status:       resourceForecasts.status,
      createdAt:    resourceForecasts.createdAt,
      projName:     projects.name,
      projId:       projects.id,
      unitCode:     projectUnits.unitCode,
      matName:      materials.name,
      matCode:      materials.code,
      matUnit:      materials.unit,
    })
      .from(resourceForecasts)
      .leftJoin(projects,      eq(resourceForecasts.projectId,  projects.id))
      .leftJoin(projectUnits,  eq(resourceForecasts.unitId,     projectUnits.id))
      .leftJoin(materials,     eq(resourceForecasts.materialId, materials.id))
      .orderBy(desc(resourceForecasts.createdAt))
      .limit(200),

    // Equipment currently assigned
    db.select({
      id:           equipmentAssignments.id,
      startDate:    equipmentAssignments.assignedDate,
      status:       equipmentAssignments.status,
      projName:     projects.name,
      projId:       projects.id,
      eqCode:       equipment.code,
      eqName:       equipment.name,
      eqType:       equipment.type,
    })
      .from(equipmentAssignments)
      .leftJoin(equipment, eq(equipmentAssignments.equipmentId, equipment.id))
      .leftJoin(projects,  eq(equipmentAssignments.projectId,   projects.id))
      .orderBy(desc(equipmentAssignments.assignedDate))
      .limit(200),

    // Manpower logs
    db.select({
      id:               constructionManpowerLogs.id,
      logDate:          constructionManpowerLogs.logDate,
      subconHeadcount:  constructionManpowerLogs.subconHeadcount,
      directStaffCount: constructionManpowerLogs.directStaffCount,
      remarks:          constructionManpowerLogs.remarks,
      projName:         projects.name,
      projId:           projects.id,
      activityCode:     activityDefinitions.activityCode,
      activityName:     activityDefinitions.activityName,
      subconName:       subcontractors.name,
    })
      .from(constructionManpowerLogs)
      .leftJoin(projects,            eq(constructionManpowerLogs.projectId,     projects.id))
      .leftJoin(activityDefinitions, eq(constructionManpowerLogs.activityDefId, activityDefinitions.id))
      .leftJoin(subcontractors,      eq(constructionManpowerLogs.subconId,      subcontractors.id))
      .orderBy(desc(constructionManpowerLogs.logDate))
      .limit(200),
  ]);

  const totalSubcon = manpowerRows.reduce((s, r) => s + r.subconHeadcount, 0);
  const totalDirect = manpowerRows.reduce((s, r) => s + r.directStaffCount, 0);
  const pendingBom  = bomRows.filter((r) => r.status === "PENDING_PR").length;
  const activeEquip = equipRows.filter((r) => r.status === "ACTIVE").length;

  const kpis = [
    { label: "BOM Forecast Lines", value: bomRows.length, sub: `${pendingBom} pending PR`, color: "#1a56db" },
    { label: "Equipment Assigned", value: equipRows.length, sub: `${activeEquip} active`, color: "#057a55" },
    { label: "Manpower Logs",      value: manpowerRows.length, sub: `${totalSubcon + totalDirect} total headcount`, color: "#7e3af2" },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Planning & Engineering</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Resource Forecasting</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>BOM material needs, equipment deployment, and manpower headcount</p>
          </div>
          <a href="/planning/resource-forecasting/new" style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT, color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>+ Log Manpower</a>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.1rem 1.25rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>{k.label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: k.color }}>{k.value.toLocaleString()}</div>
              <div style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: "0.1rem" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── BOM Forecasts ─────────────────────────────────────────── */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
            BOM Material Needs ({bomRows.length})
          </h2>
          {bomRows.length === 0 ? (
            <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
              No resource forecasts yet — issued NTPs will auto-generate BOM lines here.
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Project", "Unit", "Material", "Forecast Qty", "Issued Qty", "Status"].map((h, i) => (
                        <th key={i} style={{ padding: "0.65rem 1rem", textAlign: i >= 3 && i <= 4 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.8rem" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bomRows.map((r) => {
                      const st = STATUS_STYLE[r.status] ?? { bg: "#f3f4f6", color: "#374151" };
                      return (
                        <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.6rem 1rem", color: "#374151", fontSize: "0.82rem" }}>
                            {r.projId ? <a href={`/master-list/projects/${r.projId}`} style={{ color: "#6366f1", textDecoration: "none" }}>{r.projName}</a> : (r.projName ?? "—")}
                          </td>
                          <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#374151" }}>{r.unitCode ?? "—"}</td>
                          <td style={{ padding: "0.6rem 1rem" }}>
                            <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.82rem" }}>{r.matCode}</span>
                            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{r.matName}</div>
                          </td>
                          <td style={{ padding: "0.6rem 1rem", textAlign: "right", fontWeight: 600 }}>{Number(r.forecastQty).toFixed(2)} <span style={{ color: "#9ca3af", fontWeight: 400 }}>{r.matUnit}</span></td>
                          <td style={{ padding: "0.6rem 1rem", textAlign: "right" }}>{Number(r.actualQty).toFixed(2)}</td>
                          <td style={{ padding: "0.6rem 1rem" }}>
                            <span style={{ display: "inline-block", padding: "0.15rem 0.45rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: st.bg, color: st.color }}>
                              {r.status.replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── Equipment ─────────────────────────────────────────────── */}
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
            Equipment Deployment ({equipRows.length})
          </h2>
          {equipRows.length === 0 ? (
            <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
              No equipment assignments yet.
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "640px" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Equipment", "Type", "Project", "Start Date", "Status"].map((h) => (
                        <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.8rem" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {equipRows.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.6rem 1rem" }}>
                          <span style={{ fontWeight: 600, color: "#111827" }}>{r.eqCode}</span>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{r.eqName}</div>
                        </td>
                        <td style={{ padding: "0.6rem 1rem", color: "#374151", fontSize: "0.82rem" }}>{r.eqType ?? "—"}</td>
                        <td style={{ padding: "0.6rem 1rem", color: "#374151", fontSize: "0.82rem" }}>
                          {r.projId ? <a href={`/master-list/projects/${r.projId}`} style={{ color: "#6366f1", textDecoration: "none" }}>{r.projName}</a> : (r.projName ?? "—")}
                        </td>
                        <td style={{ padding: "0.6rem 1rem", fontSize: "0.82rem", color: "#374151" }}>{r.startDate}</td>
                        <td style={{ padding: "0.6rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.15rem 0.45rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: r.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6", color: r.status === "ACTIVE" ? "#166534" : "#6b7280" }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── Manpower ──────────────────────────────────────────────── */}
        <section>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
            Manpower Logs ({manpowerRows.length}) — {totalSubcon} subcon · {totalDirect} direct
          </h2>
          {manpowerRows.length === 0 ? (
            <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
              No manpower logs yet. <a href="/planning/resource-forecasting/new" style={{ color: ACCENT }}>Log first entry →</a>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "700px" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Date", "Project", "Activity", "Subcontractor", "Subcon HC", "Direct HC"].map((h, i) => (
                        <th key={i} style={{ padding: "0.65rem 1rem", textAlign: i >= 4 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.8rem" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manpowerRows.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#374151", whiteSpace: "nowrap" }}>{r.logDate}</td>
                        <td style={{ padding: "0.6rem 1rem", color: "#374151", fontSize: "0.82rem" }}>
                          {r.projId ? <a href={`/master-list/projects/${r.projId}`} style={{ color: "#6366f1", textDecoration: "none" }}>{r.projName}</a> : (r.projName ?? "—")}
                        </td>
                        <td style={{ padding: "0.6rem 1rem", fontSize: "0.78rem" }}>
                          {r.activityCode ? <><span style={{ fontFamily: "monospace", fontWeight: 600 }}>{r.activityCode}</span><div style={{ color: "#6b7280" }}>{r.activityName}</div></> : <span style={{ color: "#9ca3af" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.6rem 1rem", color: "#374151", fontSize: "0.82rem" }}>{r.subconName ?? <span style={{ color: "#9ca3af" }}>—</span>}</td>
                        <td style={{ padding: "0.6rem 1rem", textAlign: "right", fontWeight: 700 }}>{r.subconHeadcount}</td>
                        <td style={{ padding: "0.6rem 1rem", textAlign: "right", fontWeight: 700 }}>{r.directStaffCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
