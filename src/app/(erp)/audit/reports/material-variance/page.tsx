export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  purchaseOrderItems,
  purchaseOrders,
  mrrItems,
  materialReceivingReports,
  materials,
  projects,
} from "@/db/schema";
import { eq } from "drizzle-orm";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 6000)
      ),
    ]);
    return result;
  } catch {
    return fallback;
  }
}

export default async function MaterialVariancePage() {
  const poLines = await safe(
    () =>
      db
        .select({
          poItemId: purchaseOrderItems.id,
          poId: purchaseOrderItems.poId,
          materialId: purchaseOrderItems.materialId,
          quantityOrdered: purchaseOrderItems.quantity,
          poStatus: purchaseOrders.status,
          projectId: purchaseOrders.projectId,
          materialName: materials.name,
          materialUnit: materials.unit,
          projectName: projects.name,
        })
        .from(purchaseOrderItems)
        .leftJoin(purchaseOrders, eq(purchaseOrderItems.poId, purchaseOrders.id))
        .leftJoin(materials, eq(purchaseOrderItems.materialId, materials.id))
        .leftJoin(projects, eq(purchaseOrders.projectId, projects.id)),
    []
  );

  const mrrLines = await safe(
    () =>
      db
        .select({
          mrrItemId: mrrItems.id,
          mrrId: mrrItems.mrrId,
          materialId: mrrItems.materialId,
          quantityReceived: mrrItems.quantityReceived,
          mrrStatus: materialReceivingReports.status,
          poId: materialReceivingReports.poId,
        })
        .from(mrrItems)
        .leftJoin(
          materialReceivingReports,
          eq(mrrItems.mrrId, materialReceivingReports.id)
        ),
    []
  );

  const mrrByPoMaterial: Record<string, { received: number; status: string }> = {};
  for (const m of mrrLines) {
    const key = `${m.poId ?? ""}__${m.materialId}`;
    const received = Number(m.quantityReceived ?? 0);
    if (!mrrByPoMaterial[key]) {
      mrrByPoMaterial[key] = { received: 0, status: m.mrrStatus ?? "PENDING" };
    }
    mrrByPoMaterial[key].received += received;
    if (m.mrrStatus === "VERIFIED") {
      mrrByPoMaterial[key].status = "VERIFIED";
    }
  }

  type Row = {
    poItemId: string;
    materialName: string;
    materialUnit: string | null;
    projectName: string | null;
    ordered: number;
    received: number;
    variance: number;
    variancePct: number;
    mrrStatus: string;
  };

  const rows: Row[] = [];
  for (const line of poLines) {
    const key = `${line.poId}__${line.materialId}`;
    const mrr = mrrByPoMaterial[key];
    const ordered = Number(line.quantityOrdered ?? 0);
    const received = mrr ? mrr.received : 0;
    const variance = received - ordered;
    const variancePct = ordered > 0 ? (variance / ordered) * 100 : 0;
    const mrrStatus = mrr ? mrr.status : "NO MRR";
    if (variance !== 0 || mrrStatus === "PENDING" || mrrStatus === "NO MRR") {
      rows.push({
        poItemId: line.poItemId,
        materialName: line.materialName ?? "—",
        materialUnit: line.materialUnit,
        projectName: line.projectName ?? "—",
        ordered,
        received,
        variance,
        variancePct,
        mrrStatus,
      });
    }
  }

  const totalPoLines = poLines.length;
  const withMrr = poLines.filter((l) => {
    const key = `${l.poId}__${l.materialId}`;
    return !!mrrByPoMaterial[key];
  }).length;
  const varianceFound = rows.filter((r) => r.variance !== 0).length;

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <a href="/audit/reports" style={{ fontSize: "13px", color: "#0694a2", textDecoration: "none", fontWeight: 500 }}>
            ← Audit Reports
          </a>
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: "26px", fontWeight: 700, color: "#111827" }}>Material Variance Report</h1>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#6b7280" }}>
          Discrepancies between ordered and received materials across purchase orders and MRRs.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "4px solid #0694a2" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Total PO Lines</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0694a2" }}>{totalPoLines}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "4px solid #1a56db" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>With MRR</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1a56db" }}>{withMrr}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "4px solid #dc2626" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Variance Found</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#dc2626" }}>{varianceFound}</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#111827" }}>
              Lines with Variance or Pending MRR
            </h2>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
              No variance found — all PO lines match received quantities.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Material", "Project", "Ordered Qty", "Received Qty", "Variance", "Variance %", "Status"].map((h) => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: h === "Material" || h === "Project" || h === "Status" ? "left" : "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isOver = row.variance > 0;
                    const isUnder = row.variance < 0;
                    const varianceColor = isOver ? "#b45309" : isUnder ? "#dc2626" : "#6b7280";
                    const statusMap: Record<string, { bg: string; color: string }> = {
                      VERIFIED: { bg: "#d1fae5", color: "#065f46" },
                      PENDING: { bg: "#fef3c7", color: "#92400e" },
                      "NO MRR": { bg: "#fef2f2", color: "#dc2626" },
                    };
                    const sc = statusMap[row.mrrStatus] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    return (
                      <tr key={row.poItemId + i} style={{ borderBottom: i < rows.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827" }}>
                          {row.materialName}
                          {row.materialUnit && (
                            <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: "4px", fontSize: "12px" }}>
                              ({row.materialUnit})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#374151" }}>{row.projectName}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#374151" }}>{row.ordered.toFixed(2)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#374151" }}>{row.received.toFixed(2)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: varianceColor }}>
                          {row.variance > 0 ? "+" : ""}{row.variance.toFixed(2)}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: varianceColor }}>
                          {row.variancePct > 0 ? "+" : ""}{row.variancePct.toFixed(1)}%
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: sc.bg, color: sc.color }}>
                            {row.mrrStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
