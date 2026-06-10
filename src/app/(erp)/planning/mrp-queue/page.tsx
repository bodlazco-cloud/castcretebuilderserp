export const dynamic = "force-dynamic";

import { db } from "@/db";
import { resourceForecasts, masterBomEntries, materials, projectUnits, projects } from "@/db/schema";
import { inventoryStock, materialTransfers } from "@/db/schema/procurement";
import { eq, count, sum } from "drizzle-orm";
import { ApproveForecastButton } from "./ApproveForecastButton";
import { RaisePrButton } from "./RaisePrButton";
import { canReviewForecast, isAdminOrBod } from "@/lib/supabase-server";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_APPROVAL:     { bg: "#fef9c3", color: "#713f12",  label: "Pending Mgr Review" },
  PENDING_BOD_APPROVAL: { bg: "#eff6ff", color: "#1e40af",  label: "Pending BOD" },
  PENDING_PR:           { bg: "#fef2f2", color: "#b91c1c",  label: "Pending PR" },
  PR_CREATED:       { bg: "#eff6ff", color: "#1e40af",  label: "PR Created" },
  PO_ISSUED:        { bg: "#dbeafe", color: "#1e40af",  label: "PO Issued" },
  ISSUED:           { bg: "#dcfce7", color: "#166534",  label: "Issued" },
};

function ForecastStatusBadge({ status }: { status: string }) {
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

type MrpRow = {
  id: string;
  grossQuantity: string;
  quantityConsumed: string;
  status: "PENDING_APPROVAL" | "PENDING_BOD_APPROVAL" | "PENDING_PR" | "PR_CREATED" | "PO_ISSUED" | "ISSUED";
  purchaseRequisitionId: string | null;
  unitCode: string | null;
  unitModel: string | null;
  unitType: "BEG" | "MID" | "END" | "SHOP" | null;
  projId: string | null;
  projName: string | null;
  matName: string | null;
  matUnit: string | null;
  matCode: string | null;
  materialId: string | null;
  quantityOnHand: string | null;
  transferredQuantity: string | null;
};

export default async function MrpQueuePage() {
  const [canReview, canBodApprove] = await Promise.all([
    canReviewForecast().catch(() => false),
    isAdminOrBod().catch(() => false),
  ]);

  const [rows, statusCounts, inventoryData, transferData] = await Promise.all([
    safe(
      db
        .select({
          id:                    resourceForecasts.id,
          grossQuantity:         resourceForecasts.grossQuantity,
          quantityConsumed:      resourceForecasts.quantityConsumed,
          status:                resourceForecasts.status,
          purchaseRequisitionId: resourceForecasts.purchaseRequisitionId,
          unitCode:              projectUnits.unitCode,
          unitModel:             projectUnits.unitModel,
          unitType:              projectUnits.unitType,
          projId:                projects.id,
          projName:              projects.name,
          matName:               materials.name,
          matUnit:               materials.unit,
          matCode:               materials.code,
          materialId:            materials.id,
        })
        .from(resourceForecasts)
        .leftJoin(masterBomEntries, eq(resourceForecasts.masterBomEntryId, masterBomEntries.id))
        .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
        .leftJoin(projectUnits, eq(resourceForecasts.unitId, projectUnits.id))
        .leftJoin(projects, eq(resourceForecasts.projectId, projects.id))
        .where(eq(resourceForecasts.forecastType, "MATERIAL"))
        .orderBy(projects.name, projectUnits.unitCode),
      [] as MrpRow[],
    ),
    safe(
      db
        .select({ status: resourceForecasts.status, cnt: count() })
        .from(resourceForecasts)
        .where(eq(resourceForecasts.forecastType, "MATERIAL"))
        .groupBy(resourceForecasts.status),
      [] as { status: string; cnt: number }[],
    ),
    safe(
      db
        .select({
          projectId: inventoryStock.projectId,
          materialId: inventoryStock.materialId,
          quantityOnHand: inventoryStock.quantityOnHand,
        })
        .from(inventoryStock),
      [] as { projectId: string; materialId: string; quantityOnHand: string }[],
    ),
    safe(
      db
        .select({
          projectId: materialTransfers.projectId,
          materialId: materialTransfers.materialId,
          totalTransferred: sum(materialTransfers.quantity),
        })
        .from(materialTransfers)
        .groupBy(materialTransfers.projectId, materialTransfers.materialId),
      [] as { projectId: string; materialId: string; totalTransferred: string | null }[],
    ),
  ]);

  const statusMap = Object.fromEntries(statusCounts.map((r) => [r.status, Number(r.cnt)]));
  const pendingApproval    = statusMap["PENDING_APPROVAL"]     ?? 0;
  const pendingBodApproval = statusMap["PENDING_BOD_APPROVAL"] ?? 0;
  const pendingPr          = statusMap["PENDING_PR"]           ?? 0;
  const prCreated          = statusMap["PR_CREATED"]           ?? 0;
  const issued             = statusMap["ISSUED"]               ?? 0;

  const inventoryMap = new Map<string, string>();
  for (const inv of inventoryData) {
    const key = `${inv.projectId}:${inv.materialId}`;
    inventoryMap.set(key, inv.quantityOnHand);
  }

  const transferMap = new Map<string, string>();
  for (const tf of transferData) {
    const key = `${tf.projectId}:${tf.materialId}`;
    transferMap.set(key, tf.totalTransferred ?? "0");
  }

  type ProjectGroup = { projId: string; projName: string; rows: MrpRow[] };
  const projectMap = new Map<string, ProjectGroup>();
  for (const row of rows) {
    const pid = row.projId ?? "unknown";
    if (!projectMap.has(pid)) {
      projectMap.set(pid, { projId: pid, projName: row.projName ?? "Unknown Project", rows: [] });
    }
    projectMap.get(pid)!.rows.push(row);
  }

  const kpis = [
    { label: "Pending Mgr Review", value: pendingApproval,    accent: "#e3a008" },
    { label: "Pending BOD",        value: pendingBodApproval, accent: "#1a56db" },
    { label: "Pending PR",         value: pendingPr,          accent: "#dc2626" },
    { label: "Issued",             value: issued,             accent: "#057a55" },
  ];

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  };

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>
              ← Planning &amp; Engineering
            </a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>MRP Planning — Material Requirements</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Resource forecasts generated from approved BOM entries when an NTP is activated. Planning must approve before a PR can be raised.
          </p>
        </div>

        {(pendingApproval > 0 || pendingBodApproval > 0) && (
          <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", background: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", fontSize: "0.82rem", color: "#713f12", fontWeight: 600 }}>
            ⚠ {pendingApproval > 0 && `${pendingApproval} line${pendingApproval !== 1 ? "s" : ""} awaiting Planning Manager review`}
            {pendingApproval > 0 && pendingBodApproval > 0 && " · "}
            {pendingBodApproval > 0 && `${pendingBodApproval} line${pendingBodApproval !== 1 ? "s" : ""} awaiting BOD approval`}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{ ...card, borderTop: `3px solid ${kpi.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                {kpi.value.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>forecast lines</div>
            </div>
          ))}
        </div>

        {projectMap.size === 0 ? (
          <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>No material forecast lines found.</p>
            <p style={{ color: "#9ca3af", fontSize: "0.78rem" }}>
              Resource forecasts are created automatically when an NTP is approved with active BOM entries.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Array.from(projectMap.values()).map((proj) => {
              const projPendingApproval = proj.rows.filter((r) => r.status === "PENDING_APPROVAL").length;
              const projPendingPr       = proj.rows.filter((r) => r.status === "PENDING_PR").length;
              return (
                <div key={proj.projId} style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                  <div style={{ padding: "0.75rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: "#111827" }}>{proj.projName}</span>
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{proj.rows.length} line{proj.rows.length !== 1 ? "s" : ""}</span>
                    {projPendingApproval > 0 && (
                      <span style={{ fontSize: "0.72rem", background: "#fef9c3", color: "#713f12", padding: "0.2rem 0.55rem", borderRadius: "999px", fontWeight: 600 }}>
                        {projPendingApproval} pending approval
                      </span>
                    )}
                    {projPendingPr > 0 && (
                      <span style={{ fontSize: "0.72rem", background: "#fef2f2", color: "#b91c1c", padding: "0.2rem 0.55rem", borderRadius: "999px", fontWeight: 600 }}>
                        {projPendingPr} pending PR
                      </span>
                    )}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr>
                          {["Unit Code", "Model / Type", "Material", "Unit", "Gross Qty", "Consumed", "Remaining", "Warehouse Stock", "Transferred", "Net to Procure", "Status", "Action"].map((h) => (
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
                        {proj.rows.map((row) => {
                          const gross     = Number(row.grossQuantity);
                          const consumed  = Number(row.quantityConsumed);
                          const remaining = Math.max(0, gross - consumed);
                          const remainingPct = gross > 0 ? Math.round((remaining / gross) * 100) : 0;

                          const inventoryKey = row.projId && row.materialId ? `${row.projId}:${row.materialId}` : null;
                          const warehouseStock = inventoryKey ? Number(inventoryMap.get(inventoryKey) ?? "0") : 0;
                          const transferred = inventoryKey ? Number(transferMap.get(inventoryKey) ?? "0") : 0;
                          const netToProcure = Math.max(0, remaining - warehouseStock - transferred);

                          return (
                            <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#374151", fontWeight: 600, whiteSpace: "nowrap" }}>
                                {row.unitCode ?? <span style={{ color: "#9ca3af" }}>—</span>}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                                <span style={{ color: "#374151", fontSize: "0.82rem" }}>{row.unitModel ?? "—"}</span>
                                {row.unitType && (
                                  <span style={{ marginLeft: "0.4rem", fontSize: "0.72rem", background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 600 }}>
                                    {row.unitType}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>
                                {row.matCode && (
                                  <span style={{ fontFamily: "monospace", color: "#6b7280", fontSize: "0.75rem", marginRight: "0.35rem" }}>{row.matCode}</span>
                                )}
                                {row.matName ?? <span style={{ color: "#9ca3af" }}>—</span>}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{row.matUnit ?? "—"}</td>
                              <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#374151", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                                {gross.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#9ca3af", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                                {consumed > 0
                                  ? consumed.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                                  : <span style={{ color: "#d1d5db" }}>0</span>}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                                <span style={{ fontFamily: "monospace", fontWeight: 600, color: remaining === 0 ? "#9ca3af" : remainingPct < 20 ? "#b91c1c" : "#166534" }}>
                                  {remaining.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </span>
                                {gross > 0 && (
                                  <span style={{ color: "#9ca3af", marginLeft: "0.25rem" }}>({remainingPct}%)</span>
                                )}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#374151", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                                {warehouseStock > 0
                                  ? warehouseStock.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                                  : <span style={{ color: "#d1d5db" }}>0</span>}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#374151", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                                {transferred > 0
                                  ? transferred.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                                  : <span style={{ color: "#d1d5db" }}>0</span>}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                                <span style={{ fontWeight: 600, color: netToProcure === 0 ? "#9ca3af" : netToProcure < 10 ? "#b91c1c" : "#166534" }}>
                                  {netToProcure.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </span>
                              </td>
                              <td style={{ padding: "0.65rem 1rem" }}>
                                <ForecastStatusBadge status={row.status} />
                              </td>
                              <td style={{ padding: "0.65rem 1rem", fontSize: "0.82rem", minWidth: "120px" }}>
                                {(row.status === "PENDING_APPROVAL" || row.status === "PENDING_BOD_APPROVAL") && (
                                  <ApproveForecastButton forecastId={row.id} status={row.status} canReview={canReview} canBodApprove={canBodApprove} />
                                )}
                                {row.status === "PENDING_PR" && (
                                  <RaisePrButton forecastId={row.id} />
                                )}
                                {row.purchaseRequisitionId && (
                                  <a href={`/procurement/purchase-requisitions/${row.purchaseRequisitionId}`}
                                    style={{ color: "#1a56db", textDecoration: "none", fontWeight: 600, fontSize: "0.78rem" }}>
                                    View PR →
                                  </a>
                                )}
                                {!["PENDING_APPROVAL", "PENDING_PR"].includes(row.status) && !row.purchaseRequisitionId && (
                                  <span style={{ color: "#d1d5db" }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
