export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  materialReceivingReports,
  mrrItems,
  projects,
  suppliers,
  materials,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(promise: Promise<T>): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
  ]);
}

export default async function ReceiptsPage() {
  const [rows, items] = await Promise.all([
    safe(
      db
        .select({
          id: materialReceivingReports.id,
          status: materialReceivingReports.status,
          receivedDate: materialReceivingReports.receivedDate,
          sourceType: materialReceivingReports.sourceType,
          notes: materialReceivingReports.notes,
          projectName: projects.name,
          supplierName: suppliers.name,
        })
        .from(materialReceivingReports)
        .leftJoin(projects, eq(materialReceivingReports.projectId, projects.id))
        .leftJoin(suppliers, eq(materialReceivingReports.supplierId, suppliers.id))
        .orderBy(desc(materialReceivingReports.receivedDate))
        .limit(100)
    ),
    safe(
      db
        .select({
          mrrId: mrrItems.mrrId,
          materialName: materials.name,
          unit: materials.unit,
          quantityReceived: mrrItems.quantityReceived,
          unitPrice: mrrItems.unitPrice,
        })
        .from(mrrItems)
        .leftJoin(materials, eq(mrrItems.materialId, materials.id))
    ),
  ]);

  const safeRows = rows ?? [];
  const safeItems = items ?? [];

  const itemsByMrr = new Map<string, typeof safeItems>();
  for (const item of safeItems) {
    if (!item.mrrId) continue;
    const key = String(item.mrrId);
    if (!itemsByMrr.has(key)) itemsByMrr.set(key, []);
    itemsByMrr.get(key)!.push(item);
  }

  const totalMRRs = safeRows.length;
  const verified = safeRows.filter((r) => r.status === "VERIFIED").length;
  const pending = safeRows.filter((r) => r.status === "PENDING").length;

  function statusBadge(status: string | null) {
    let bg = "#f3f4f6";
    let color = "#6b7280";
    if (status === "PENDING") { bg = "#fef9c3"; color = "#713f12"; }
    else if (status === "VERIFIED") { bg = "#dcfce7"; color = "#166534"; }
    return (
      <span style={{ background: bg, color, borderRadius: "9999px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 600 }}>
        {status ?? "—"}
      </span>
    );
  }

  function sourceTypeBadge(sourceType: string | null) {
    let bg = "#f3f4f6";
    let color = "#6b7280";
    if (sourceType === "SUPPLIER") { bg = "#eff6ff"; color = "#1e40af"; }
    else if (sourceType === "TRANSFER") { bg = "#f5f3ff"; color = "#5b21b6"; }
    return (
      <span style={{ background: bg, color, borderRadius: "9999px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 600 }}>
        {sourceType ?? "—"}
      </span>
    );
  }

  function fmt(n: number | string | null | undefined) {
    const v = Number(n ?? 0);
    return "₱" + v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        details > summary { list-style: none; cursor: pointer; }
        details > summary::-webkit-details-marker { display: none; }
        .mrr-chevron { display: inline-block; transition: transform 0.2s; margin-right: 6px; color: #9ca3af; }
        details[open] .mrr-chevron { transform: rotate(90deg); }
        details > summary:hover { background: #f9fafb; }
      `}</style>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement" style={{ fontSize: "0.8rem", color: "#e3a008", textDecoration: "none" }}>← Procurement &amp; Stock</a>
        </div>
        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Material Receiving Reports</h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem" }}>Material delivery receipts and GRN records.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: "4px solid #e3a008" }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>Total MRRs</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#e3a008" }}>{totalMRRs}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: "4px solid #057a55" }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>Verified</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#057a55" }}>{verified}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: "4px solid #dc2626" }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>Pending</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#dc2626" }}>{pending}</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          {safeRows.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>No receipts found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Receipt #</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Project</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Supplier</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Source Type</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Received Date</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Items</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {safeRows.map((row) => {
                  const rowItems = itemsByMrr.get(String(row.id)) ?? [];
                  const shortId = String(row.id).slice(0, 8);
                  const dateStr = row.receivedDate
                    ? new Date(row.receivedDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                    : "—";
                  return (
                    <tr key={String(row.id)} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <details>
                          <summary style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 80px 1fr", alignItems: "center", padding: "0.75rem 1rem", gap: "0.5rem" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#374151" }}>
                              <span className="mrr-chevron">▶</span>#{shortId}…
                            </span>
                            <span style={{ color: "#374151" }}>{row.projectName ?? "—"}</span>
                            <span style={{ color: "#374151" }}>{row.supplierName ?? "—"}</span>
                            <span>{sourceTypeBadge(row.sourceType)}</span>
                            <span style={{ color: "#374151" }}>{dateStr}</span>
                            <span style={{ color: "#6b7280" }}>{rowItems.length}</span>
                            <span>{statusBadge(row.status)}</span>
                          </summary>
                          {rowItems.length > 0 && (
                            <div style={{ padding: "0.75rem 1.5rem 1rem 2.5rem", background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
                              {row.notes && (
                                <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "#6b7280" }}>
                                  <strong>Notes:</strong> {row.notes}
                                </p>
                              )}
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
                                <thead>
                                  <tr style={{ background: "#f3f4f6" }}>
                                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Material</th>
                                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Unit</th>
                                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontWeight: 600, color: "#374151" }}>Qty Received</th>
                                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontWeight: 600, color: "#374151" }}>Unit Price</th>
                                    <th style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontWeight: 600, color: "#374151" }}>Line Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rowItems.map((item, idx) => {
                                    const qty = Number(item.quantityReceived ?? 0);
                                    const price = Number(item.unitPrice ?? 0);
                                    const total = qty * price;
                                    return (
                                      <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                        <td style={{ padding: "0.5rem 0.75rem", color: "#374151" }}>{item.materialName ?? "—"}</td>
                                        <td style={{ padding: "0.5rem 0.75rem", color: "#6b7280" }}>{item.unit ?? "—"}</td>
                                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "#374151" }}>{qty.toLocaleString()}</td>
                                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "#374151" }}>{fmt(price)}</td>
                                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontWeight: 600, color: "#374151" }}>{fmt(total)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {rowItems.length === 0 && (
                            <div style={{ padding: "0.75rem 2.5rem", background: "#f9fafb", borderTop: "1px solid #e5e7eb", color: "#9ca3af", fontSize: "0.825rem" }}>
                              No items recorded for this receipt.
                            </div>
                          )}
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
