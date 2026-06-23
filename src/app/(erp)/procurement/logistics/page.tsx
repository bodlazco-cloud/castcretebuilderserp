export const dynamic = "force-dynamic";

import { db } from "@/db";
import { materialTransfers, materials, projects, projectUnits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(promise: Promise<T>): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
  ]);
}

export default async function LogisticsPage() {
  const rows = await safe(
    db
      .select({
        id: materialTransfers.id,
        quantity: materialTransfers.quantity,
        unitPrice: materialTransfers.unitPrice,
        isOsm: materialTransfers.isOsm,
        transferDate: materialTransfers.transferDate,
        status: materialTransfers.status,
        materialName: materials.name,
        materialUnit: materials.unit,
        materialCategory: materials.category,
        projectName: projects.name,
        unitCode: projectUnits.unitCode,
      })
      .from(materialTransfers)
      .leftJoin(materials, eq(materialTransfers.materialId, materials.id))
      .leftJoin(projects, eq(materialTransfers.projectId, projects.id))
      .leftJoin(projectUnits, eq(materialTransfers.unitId, projectUnits.id))
      .orderBy(desc(materialTransfers.transferDate))
      .limit(200)
  );

  const safeRows = rows ?? [];

  const totalTransfers = safeRows.length;
  const osmTransfers = safeRows.filter((r) => r.isOsm).length;
  const pendingCount = safeRows.filter((r) => r.status === "PENDING").length;
  const totalValue = safeRows.reduce(
    (sum, r) => sum + Number(r.quantity ?? 0) * Number(r.unitPrice ?? 0),
    0
  );

  function statusBadge(status: string | null) {
    let bg = "#f3f4f6";
    let color = "#6b7280";
    if (status === "PENDING") { bg = "#fef9c3"; color = "#713f12"; }
    else if (status === "SIGNED") { bg = "#dcfce7"; color = "#166534"; }
    return (
      <span style={{ background: bg, color, borderRadius: "9999px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 600 }}>
        {status ?? "—"}
      </span>
    );
  }

  function fmtDate(d: string | Date | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  }

  function fmtCurrency(n: number) {
    return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement" style={{ fontSize: "0.8rem", color: "#e3a008", textDecoration: "none" }}>← Procurement &amp; Stock</a>
        </div>
        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Procurement Logistics</h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem" }}>Material transfer and delivery logs.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: "4px solid #e3a008" }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>Total Transfers</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#e3a008" }}>{totalTransfers}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: "4px solid #dc2626" }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>Pending Signature</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#dc2626" }}>{pendingCount}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: "4px solid #7e3af2" }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>OSM Transfers</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#7e3af2" }}>{osmTransfers}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: "4px solid #057a55" }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>Total Value</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#057a55" }}>
              {"₱" + totalValue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          {safeRows.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>No material transfers found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Date</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Material</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Category</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Project</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Unit</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#374151" }}>Qty</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Unit Price</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, color: "#374151" }}>Total</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600, color: "#374151" }}>OSM</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {safeRows.map((row) => {
                    const qty = Number(row.quantity ?? 0);
                    const price = Number(row.unitPrice ?? 0);
                    const total = qty * price;
                    const rowBg = row.isOsm ? "#faf5ff" : "#fff";
                    return (
                      <tr key={String(row.id)} style={{ borderBottom: "1px solid #f3f4f6", background: rowBg }}>
                        <td style={{ padding: "0.75rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {fmtDate(row.transferDate)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ fontWeight: 600, color: "#111827" }}>{row.materialName ?? "—"}</div>
                          {row.materialUnit && (
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{row.materialUnit}</div>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {row.materialCategory ? (
                            <span style={{ background: "#f3f4f6", color: "#374151", borderRadius: "9999px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 500 }}>
                              {row.materialCategory}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#374151" }}>{row.projectName ?? "—"}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "#374151" }}>{row.unitCode ?? "—"}</td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#374151", whiteSpace: "nowrap" }}>
                          {qty.toLocaleString("en-PH", { maximumFractionDigits: 2 })}
                          {row.materialUnit && (
                            <span style={{ color: "#9ca3af", marginLeft: "4px" }}>{row.materialUnit}</span>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#374151", whiteSpace: "nowrap" }}>
                          {fmtCurrency(price)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>
                          {"₱" + (qty * price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          {row.isOsm ? (
                            <span style={{ background: "#f5f3ff", color: "#7e3af2", borderRadius: "9999px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 600 }}>OSM</span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {statusBadge(row.status)}
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
