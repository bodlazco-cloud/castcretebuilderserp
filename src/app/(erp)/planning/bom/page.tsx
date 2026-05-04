export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import { bomStandards, activityDefinitions, materials } from "@/db/schema";
import { eq } from "drizzle-orm";

const ACCENT = "#1a56db";

export default async function BomRegisterPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:               bomStandards.id,
      unitModel:        bomStandards.unitModel,
      unitType:         bomStandards.unitType,
      quantityPerUnit:  bomStandards.quantityPerUnit,
      version:          bomStandards.version,
      isActive:         bomStandards.isActive,
      activityDefId:    activityDefinitions.id,
      activityCode:     activityDefinitions.activityCode,
      activityName:     activityDefinitions.activityName,
      scopeName:        activityDefinitions.scopeName,
      matCode:          materials.code,
      matName:          materials.name,
      matUnit:          materials.unit,
    })
    .from(bomStandards)
    .leftJoin(activityDefinitions, eq(bomStandards.activityDefId, activityDefinitions.id))
    .leftJoin(materials,           eq(bomStandards.materialId, materials.id))
    .orderBy(activityDefinitions.category, activityDefinitions.sequenceOrder, bomStandards.unitModel, bomStandards.unitType);

  // Group: activityDef → unitModel+unitType → lines
  type BomLine = typeof rows[number];
  type UnitGroup    = { unitModel: string; unitType: string; lines: BomLine[] };
  type ActivityGroup = { activityDefId: string; activityCode: string; activityName: string; scopeName: string; unitGroups: Map<string, UnitGroup> };

  const activityMap = new Map<string, ActivityGroup>();

  for (const row of rows) {
    const aid = row.activityDefId ?? "unknown";
    if (!activityMap.has(aid)) {
      activityMap.set(aid, {
        activityDefId: aid,
        activityCode:  row.activityCode ?? "",
        activityName:  row.activityName ?? "",
        scopeName:     row.scopeName ?? "",
        unitGroups:    new Map(),
      });
    }
    const act = activityMap.get(aid)!;

    const ugKey = `${row.unitModel}::${row.unitType}`;
    if (!act.unitGroups.has(ugKey)) {
      act.unitGroups.set(ugKey, { unitModel: row.unitModel, unitType: row.unitType, lines: [] });
    }
    act.unitGroups.get(ugKey)!.lines.push(row);
  }

  const activeCount   = rows.filter((r) => r.isActive).length;
  const archivedCount = rows.filter((r) => !r.isActive).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Planning & Engineering</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Bill of Materials</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {activeCount} active line{activeCount !== 1 ? "s" : ""}
              {archivedCount > 0 && ` · ${archivedCount} archived`}
            </p>
          </div>
          <a href="/planning/bom/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ New BOM Entry</a>
        </div>

        {activityMap.size === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No BOM entries yet. <a href="/planning/bom/new" style={{ color: ACCENT }}>Add first BOM →</a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {Array.from(activityMap.values()).map((act) => (
              <div key={act.activityDefId} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                {/* Activity header */}
                <div style={{ padding: "0.85rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 700, color: "#374151", background: "#e5e7eb", padding: "0.1rem 0.45rem", borderRadius: "4px" }}>
                    {act.activityCode}
                  </span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>{act.activityName}</span>
                  <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>— {act.scopeName}</span>
                  <a href={`/master-list/sow/${act.activityDefId}`} style={{ marginLeft: "auto", fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>View scope →</a>
                </div>

                {Array.from(act.unitGroups.values()).map((ug) => {
                  const activeLines   = ug.lines.filter((l) => l.isActive);
                  const archivedLines = ug.lines.filter((l) => !l.isActive);
                  return (
                    <div key={`${ug.unitModel}::${ug.unitType}`} style={{ padding: "0.75rem 1.25rem 0.75rem 1.25rem", borderBottom: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151" }}>{ug.unitModel}</span>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.1rem 0.4rem", borderRadius: "999px", background: "#e0e7ff", color: "#3730a3" }}>
                          {ug.unitType}
                        </span>
                        {activeLines.length > 0 && (
                          <span style={{ fontSize: "0.72rem", color: "#166534" }}>{activeLines.length} active line{activeLines.length !== 1 ? "s" : ""}</span>
                        )}
                        {archivedLines.length > 0 && (
                          <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>· {archivedLines.length} archived</span>
                        )}
                      </div>

                      {activeLines.length > 0 && (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", marginBottom: archivedLines.length > 0 ? "0.5rem" : 0 }}>
                          <thead>
                            <tr>
                              {["Material Code", "Material Name", "Unit", "Qty / Unit", "Ver."].map((h, i) => (
                                <th key={i} style={{ padding: "0.3rem 0.5rem", textAlign: i === 3 ? "right" : "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {activeLines.map((line) => (
                              <tr key={line.id}>
                                <td style={{ padding: "0.3rem 0.5rem", fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>{line.matCode}</td>
                                <td style={{ padding: "0.3rem 0.5rem", color: "#111827" }}>{line.matName}</td>
                                <td style={{ padding: "0.3rem 0.5rem", color: "#6b7280" }}>{line.matUnit}</td>
                                <td style={{ padding: "0.3rem 0.5rem", textAlign: "right", fontWeight: 700, color: "#111827" }}>
                                  {Number(line.quantityPerUnit).toFixed(4)}
                                </td>
                                <td style={{ padding: "0.3rem 0.5rem", color: "#9ca3af", textAlign: "center" }}>v{line.version}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {archivedLines.length > 0 && (
                        <details style={{ marginTop: "0.25rem" }}>
                          <summary style={{ fontSize: "0.75rem", color: "#9ca3af", cursor: "pointer", userSelect: "none" }}>
                            {archivedLines.length} archived line{archivedLines.length !== 1 ? "s" : ""}
                          </summary>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", marginTop: "0.4rem", opacity: 0.6 }}>
                            <tbody>
                              {archivedLines.map((line) => (
                                <tr key={line.id}>
                                  <td style={{ padding: "0.25rem 0.5rem", fontFamily: "monospace", color: "#374151" }}>{line.matCode}</td>
                                  <td style={{ padding: "0.25rem 0.5rem", color: "#374151" }}>{line.matName}</td>
                                  <td style={{ padding: "0.25rem 0.5rem", color: "#6b7280" }}>{line.matUnit}</td>
                                  <td style={{ padding: "0.25rem 0.5rem", textAlign: "right" }}>{Number(line.quantityPerUnit).toFixed(4)}</td>
                                  <td style={{ padding: "0.25rem 0.5rem", color: "#9ca3af", textAlign: "center" }}>v{line.version}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
