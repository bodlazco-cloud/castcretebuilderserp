export const dynamic = "force-dynamic";
import { db } from "@/db";
import { activityDefinitions, projects, bomStandards, materials, masterBomEntries } from "@/db/schema";
import { phaseActivities, phaseScopes } from "@/db/schema/phases";
import { eq, or, and } from "drizzle-orm";
import { getAuthUser, isAdminOrBod } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { EditSowForm } from "./EditSowForm";

const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function SowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const isAdmin = await isAdminOrBod();
  const { id } = await params;

  const [activity] = await db
    .select({
      id:                   activityDefinitions.id,
      projectId:            activityDefinitions.projectId,
      category:             activityDefinitions.category,
      scopeCode:            activityDefinitions.scopeCode,
      scopeName:            activityDefinitions.scopeName,
      activityCode:         activityDefinitions.activityCode,
      activityName:         activityDefinitions.activityName,
      standardDurationDays: activityDefinitions.standardDurationDays,
      weightInScopePct:     activityDefinitions.weightInScopePct,
      sequenceOrder:        activityDefinitions.sequenceOrder,
      isActive:             activityDefinitions.isActive,
      createdAt:            activityDefinitions.createdAt,
      projName:             projects.name,
    })
    .from(activityDefinitions)
    .leftJoin(projects, eq(activityDefinitions.projectId, projects.id))
    .where(eq(activityDefinitions.id, id));

  if (!activity) notFound();

  const [bomRows, masterBomRows, projectList] = await Promise.all([
    db.select({
      id:              bomStandards.id,
      unitModel:       bomStandards.unitModel,
      unitType:        bomStandards.unitType,
      quantityPerUnit: bomStandards.quantityPerUnit,
      isActive:        bomStandards.isActive,
      matCode:         materials.code,
      matName:         materials.name,
      matUnit:         materials.unit,
    })
    .from(bomStandards)
    .leftJoin(materials, eq(bomStandards.materialId, materials.id))
    .where(eq(bomStandards.activityDefId, id))
    .orderBy(bomStandards.isActive, bomStandards.unitModel),

    db.select({
      id:              masterBomEntries.id,
      unitModel:       masterBomEntries.unitModel,
      unitType:        masterBomEntries.unitType,
      quantityPerUnit: masterBomEntries.quantityPerUnit,
      status:          masterBomEntries.status,
      version:         masterBomEntries.version,
      activityCode:    phaseActivities.code,
      activityName:    phaseActivities.name,
      scopeCode:       phaseScopes.code,
      matCode:         materials.code,
      matName:         materials.name,
      matUnit:         materials.unit,
    })
    .from(masterBomEntries)
    .leftJoin(phaseActivities, eq(masterBomEntries.phaseActivityId, phaseActivities.id))
    .leftJoin(phaseScopes, eq(masterBomEntries.phaseScopeId, phaseScopes.id))
    .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
    .where(
      or(
        eq(masterBomEntries.activityDefId, id),
        and(
          eq(phaseScopes.code, activity.scopeCode),
          activity.activityCode
            ? eq(phaseActivities.code, activity.activityCode)
            : undefined,
        ),
      ),
    ),

    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
  ]);

  const activeBom   = bomRows.filter((b) => b.isActive);
  const archivedBom = bomRows.filter((b) => !b.isActive);

  const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
    DRAFT:          { bg: "#f3f4f6", color: "#6b7280" },
    PENDING_REVIEW: { bg: "#fef9c3", color: "#713f12" },
    APPROVED:       { bg: "#dcfce7", color: "#166534" },
    REJECTED:       { bg: "#fef2f2", color: "#b91c1c" },
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/sow" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Scope of Work</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: "0 0 0.2rem", fontFamily: "monospace", fontSize: "0.85rem", color: "#6b7280" }}>{activity.activityCode}</p>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{activity.scopeName}</h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#eff6ff", color: "#1e40af" }}>
                {activity.category}
              </span>
              <span style={{
                display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                background: activity.isActive ? "#dcfce7" : "#f3f4f6", color: activity.isActive ? "#166534" : "#6b7280",
              }}>{activity.isActive ? "Active" : "Inactive"}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {isAdmin && (
              <EditSowForm
                activity={{
                  id: activity.id,
                  projectId: activity.projectId,
                  category: activity.category,
                  scopeCode: activity.scopeCode,
                  scopeName: activity.scopeName,
                  activityCode: activity.activityCode,
                  activityName: activity.activityName,
                  standardDurationDays: activity.standardDurationDays,
                  weightInScopePct: activity.weightInScopePct,
                  sequenceOrder: activity.sequenceOrder,
                }}
                projects={projectList}
              />
            )}
            <a href={`/planning/bom/new?activityDefId=${id}`} style={{
              padding: "0.5rem 1rem", borderRadius: "6px", background: "#1a56db",
              color: "#fff", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
            }}>+ Add BOM Entry</a>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Activity Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div>
              <div style={LABEL}>Project</div>
              {activity.projectId
                ? <a href={`/master-list/projects/${activity.projectId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{activity.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div><div style={LABEL}>Scope Code</div><div style={VALUE}>{activity.scopeCode}</div></div>
            <div><div style={LABEL}>Activity Name</div><div style={VALUE}>{activity.activityName || "—"}</div></div>
            <div><div style={LABEL}>Std. Duration</div><div style={VALUE}>{activity.standardDurationDays} days</div></div>
            <div><div style={LABEL}>Weight in Scope</div><div style={VALUE}>{Number(activity.weightInScopePct).toFixed(2)}%</div></div>
            <div><div style={LABEL}>Sequence Order</div><div style={VALUE}>#{activity.sequenceOrder}</div></div>
          </div>
        </div>

        {/* Master BOM Entries (from Planning BOM) */}
        {masterBomRows.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
                BOM Entries ({masterBomRows.length} lines)
              </h2>
              <a href="/planning/bom" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>View in BOM Register →</a>
            </div>
            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: "1.5rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Material", "Unit", "Qty / Unit", "Unit Model", "Unit Type", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "0.6rem 0.9rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {masterBomRows.map((b) => {
                    const badge = STATUS_BADGE[b.status] ?? STATUS_BADGE.DRAFT;
                    return (
                      <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.6rem 0.9rem", fontWeight: 500, color: "#111827" }}>
                          {b.matCode && <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6b7280", marginRight: "0.35rem" }}>{b.matCode}</span>}
                          {b.matName ?? "—"}
                        </td>
                        <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{b.matUnit ?? "—"}</td>
                        <td style={{ padding: "0.6rem 0.9rem", fontFamily: "monospace", fontWeight: 600, color: "#374151" }}>{Number(b.quantityPerUnit).toFixed(4)}</td>
                        <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{b.unitModel}</td>
                        <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{b.unitType}</td>
                        <td style={{ padding: "0.6rem 0.9rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: badge.bg, color: badge.color }}>{b.status.replace("_", " ")}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Legacy BOM Standards */}
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
          BOM Standards ({activeBom.length} lines)
        </h2>
        {activeBom.length === 0 ? (
          <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            No BOM standards defined. <a href={`/planning/bom/new?activityDefId=${id}`} style={{ color: "#6366f1" }}>Add BOM entry →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: "1.5rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Material Code", "Material Name", "Unit", "Unit Model", "Unit Type", "Qty / Unit"].map((h, i) => (
                    <th key={i} style={{ padding: "0.6rem 0.9rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeBom.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.6rem 0.9rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#374151" }}>{b.matCode ?? "—"}</td>
                    <td style={{ padding: "0.6rem 0.9rem", fontWeight: 500, color: "#111827" }}>{b.matName ?? "—"}</td>
                    <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{b.matUnit ?? "—"}</td>
                    <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{b.unitModel}</td>
                    <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{b.unitType}</td>
                    <td style={{ padding: "0.6rem 0.9rem", fontWeight: 600, color: "#374151" }}>{Number(b.quantityPerUnit).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {archivedBom.length > 0 && (
          <details>
            <summary style={{ cursor: "pointer", fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
              Archived BOM Versions ({archivedBom.length})
            </summary>
            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden", opacity: 0.6 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Material Code", "Material Name", "Unit Model", "Unit Type", "Qty / Unit"].map((h, i) => (
                      <th key={i} style={{ padding: "0.5rem 0.9rem", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {archivedBom.map((b) => (
                    <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.5rem 0.9rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#374151" }}>{b.matCode ?? "—"}</td>
                      <td style={{ padding: "0.5rem 0.9rem", color: "#374151" }}>{b.matName ?? "—"}</td>
                      <td style={{ padding: "0.5rem 0.9rem", color: "#6b7280" }}>{b.unitModel}</td>
                      <td style={{ padding: "0.5rem 0.9rem", color: "#6b7280" }}>{b.unitType}</td>
                      <td style={{ padding: "0.5rem 0.9rem", color: "#374151" }}>{Number(b.quantityPerUnit).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
