export const dynamic = "force-dynamic";
import { db } from "@/db";
import { materialReceivingReports, projects, suppliers, mrrItems, materials } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#e3a008";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "#fef9c3", color: "#713f12" },
  VERIFIED:  { bg: "#dcfce7", color: "#166534" },
  REJECTED:  { bg: "#fef2f2", color: "#b91c1c" },
};

const SOURCE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  SUPPLIER:      { bg: "#eff6ff", color: "#1e40af", label: "Supplier" },
  DEVELOPER_OSM: { bg: "#f0fdf4", color: "#166534", label: "Dev. OSM" },
};

export default async function ReceiptsAndTransfersPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:           materialReceivingReports.id,
      sourceType:   materialReceivingReports.sourceType,
      receivedDate: materialReceivingReports.receivedDate,
      status:       materialReceivingReports.status,
      createdAt:    materialReceivingReports.createdAt,
      projName:     projects.name,
      projId:       projects.id,
      supplierName: suppliers.name,
    })
    .from(materialReceivingReports)
    .leftJoin(projects,   eq(materialReceivingReports.projectId,   projects.id))
    .leftJoin(suppliers,  eq(materialReceivingReports.supplierId,  suppliers.id))
    .orderBy(desc(materialReceivingReports.receivedDate), desc(materialReceivingReports.createdAt));

  // Item counts per MRR
  const itemCounts = await db
    .select({ mrrId: mrrItems.mrrId, lines: count() })
    .from(mrrItems)
    .groupBy(mrrItems.mrrId);

  const countMap = Object.fromEntries(itemCounts.map((c) => [c.mrrId, Number(c.lines)]));

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Procurement & Stock</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Receipts & Transfers</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {rows.length} material receiving report{rows.length !== 1 ? "s" : ""}
            </p>
          </div>
          <a href="/procurement/receipts-and-transfers/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ New MRR</a>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No receiving reports yet. <a href="/procurement/receipts-and-transfers/new" style={{ color: ACCENT }}>Record first receipt →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "780px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Date", "Project", "Supplier", "Source", "Lines", "Status", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE.PENDING;
                    const src = SOURCE_STYLE[r.sourceType] ?? SOURCE_STYLE.SUPPLIER;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#374151", whiteSpace: "nowrap" }}>
                          {r.receivedDate}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500 }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.supplierName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: src.bg, color: src.color }}>
                            {src.label}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{countMap[r.id] ?? 0}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: ss.bg, color: ss.color }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/procurement/receipts-and-transfers/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
