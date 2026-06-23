export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, materials, masterBomEntries, subcontractorRateCards } from "@/db/schema";
import { phaseScopes, phaseActivities } from "@/db/schema/phases";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  DRAFT:          { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW: { bg: "#fef9c3", color: "#713f12" },
  APPROVED:       { bg: "#dcfce7", color: "#166534" },
  REJECTED:       { bg: "#fef2f2", color: "#b91c1c" },
};

function StatusBadge({ status }: { status: string }) {
  const b = STATUS_BADGE[status] ?? STATUS_BADGE.DRAFT;
  return (
    <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: b.bg, color: b.color }}>
      {status.replace("_", " ")}
    </span>
  );
}

export default async function SowPage() {
  await getAuthUser();

  const [projectRows, bomRows, laborRows] = await Promise.all([
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),

    db.select({
      id:              masterBomEntries.id,
      projectId:       masterBomEntries.projectId,
      unitModel:       masterBomEntries.unitModel,
      unitType:        masterBomEntries.unitType,
      quantityPerUnit: masterBomEntries.quantityPerUnit,
      status:          masterBomEntries.status,
      scopeCode:       phaseScopes.code,
      scopeName:       phaseScopes.name,
      activityCode:    phaseActivities.code,
      activityName:    phaseActivities.name,
      matCode:         materials.code,
      matName:         materials.name,
      matUnit:         materials.unit,
    })
    .from(masterBomEntries)
    .leftJoin(phaseScopes, eq(masterBomEntries.phaseScopeId, phaseScopes.id))
    .leftJoin(phaseActivities, eq(masterBomEntries.phaseActivityId, phaseActivities.id))
    .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
    .where(eq(masterBomEntries.isActive, true))
    .orderBy(phaseScopes.code, phaseActivities.code, masterBomEntries.unitModel),

    db.select({
      id:              subcontractorRateCards.id,
      projectId:       subcontractorRateCards.projectId,
      unitModel:       subcontractorRateCards.unitModel,
      unitType:        subcontractorRateCards.unitType,
      ratePerUnit:     subcontractorRateCards.ratePerUnit,
      retentionPct:    subcontractorRateCards.retentionPct,
      isActive:        subcontractorRateCards.isActive,
      scopeCode:       phaseScopes.code,
      scopeName:       phaseScopes.name,
      activityCode:    phaseActivities.code,
      activityName:    phaseActivities.name,
    })
    .from(subcontractorRateCards)
    .leftJoin(phaseActivities, eq(subcontractorRateCards.phaseActivityId, phaseActivities.id))
    .leftJoin(phaseScopes, eq(subcontractorRateCards.phaseScopeId, phaseScopes.id))
    .orderBy(phaseScopes.code, phaseActivities.code, subcontractorRateCards.unitModel),
  ]);

  const projectsWithData = projectRows.filter(
    (p) => bomRows.some((b) => b.projectId === p.id) || laborRows.some((l) => l.projectId === p.id),
  );

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Master List</a>
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Scope of Work — BOM Overview</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            Material BOM and Labor BOM (subcontractor rates) per project, for reference across departments.
          </p>
        </div>

        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.85rem 1.1rem", fontSize: "0.82rem", color: "#1e40af", marginBottom: "1.5rem" }}>
          This is a read-only overview. Scope/activity definitions are managed under{" "}
          <a href="/master-list/construction-phases" style={{ color: "#1e40af", textDecoration: "underline", fontWeight: 600 }}>Construction Phases</a>.
          Material BOM is edited in{" "}
          <a href="/planning/bom" style={{ color: "#1e40af", textDecoration: "underline", fontWeight: 600 }}>Planning &amp; Engineering → BOM Register</a>{" "}
          (Planning) and material pricing in Procurement; Labor BOM rates are edited on each project&rsquo;s page or under{" "}
          <a href="/master-list/subcontractors" style={{ color: "#1e40af", textDecoration: "underline", fontWeight: 600 }}>Subcontractors</a>.
          All changes require Admin / BOD approval before they take final effect.
        </div>

        {projectsWithData.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No BOM or Labor BOM entries found yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {projectsWithData.map((proj) => {
              const bom   = bomRows.filter((b) => b.projectId === proj.id);
              const labor = laborRows.filter((l) => l.projectId === proj.id);
              return (
                <div key={proj.id} style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                  <div style={{ padding: "0.85rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                    <a href={`/master-list/projects/${proj.id}`} style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", textDecoration: "none" }}>{proj.name}</a>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <a href={`/planning/bom`} style={{ fontSize: "0.78rem", color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>Material BOM Register →</a>
                      <a href={`/master-list/projects/${proj.id}`} style={{ fontSize: "0.78rem", color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>Labor BOM →</a>
                    </div>
                  </div>

                  {/* Material BOM */}
                  <div style={{ padding: "1rem 1.25rem" }}>
                    <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>Material BOM ({bom.length} lines)</h3>
                    {bom.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "#9ca3af" }}>No material BOM entries for this project yet.</p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                          <thead>
                            <tr>
                              {["Scope", "Activity", "Material", "Unit", "Qty/Unit", "Unit Model", "Type", "Status"].map((h) => (
                                <th key={h} style={{ padding: "0.4rem 0.75rem 0.4rem 0", textAlign: "left", fontWeight: 600, color: "#9ca3af", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {bom.map((b) => (
                              <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "#374151" }}>{b.scopeCode ? `[${b.scopeCode}] ${b.scopeName}` : "—"}</td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "#6b7280" }}>{b.activityCode ? `[${b.activityCode}] ${b.activityName}` : "—"}</td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", fontWeight: 500, color: "#111827" }}>
                                  {b.matCode && <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#6b7280", marginRight: "0.3rem" }}>{b.matCode}</span>}
                                  {b.matName ?? "—"}
                                </td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "#6b7280" }}>{b.matUnit ?? "—"}</td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", fontFamily: "monospace", fontWeight: 600, color: "#374151" }}>{Number(b.quantityPerUnit).toFixed(4)}</td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "#6b7280" }}>{b.unitModel}</td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "#6b7280" }}>{b.unitType}</td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0" }}><StatusBadge status={b.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Labor BOM */}
                  <div style={{ padding: "0 1.25rem 1.25rem", borderTop: "1px solid #f3f4f6" }}>
                    <h3 style={{ margin: "1rem 0 0.6rem", fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>Labor BOM — Subcontractor Rates ({labor.length} lines)</h3>
                    {labor.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "#9ca3af" }}>No labor rate entries for this project yet.</p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                          <thead>
                            <tr>
                              {["Scope", "Activity", "Unit Model", "Type", "Rate / Unit", "Retention", "Status"].map((h) => (
                                <th key={h} style={{ padding: "0.4rem 0.75rem 0.4rem 0", textAlign: "left", fontWeight: 600, color: "#9ca3af", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {labor.map((l) => (
                              <tr key={l.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "#374151" }}>{l.scopeCode ? `[${l.scopeCode}] ${l.scopeName}` : "—"}</td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "#6b7280" }}>{l.activityCode ? `[${l.activityCode}] ${l.activityName}` : "—"}</td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "#6b7280" }}>{l.unitModel ?? "—"}</td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "#6b7280" }}>{l.unitType ?? "—"}</td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", fontFamily: "monospace", fontWeight: 600, color: "#374151" }}>
                                  PHP {Number(l.ratePerUnit).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "#6b7280" }}>{(Number(l.retentionPct) * 100).toFixed(2)}%</td>
                                <td style={{ padding: "0.45rem 0.75rem 0.45rem 0" }}>
                                  <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: l.isActive ? "#dcfce7" : "#f3f4f6", color: l.isActive ? "#166534" : "#6b7280" }}>
                                    {l.isActive ? "Active" : "Inactive"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
