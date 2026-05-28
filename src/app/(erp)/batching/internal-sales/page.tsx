export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  batchingInternalSales, concreteDeliveryReceipts,
  projects, projectUnits,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const ACCENT = "#1a56db";
const PHP = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default async function InternalSalesPage() {
  const [sales, totals] = await Promise.all([
    db
      .select({
        id:                   batchingInternalSales.id,
        transactionDate:      batchingInternalSales.transactionDate,
        projectName:          projects.name,
        unitCode:             projectUnits.unitCode,
        volumeM3:             batchingInternalSales.volumeM3,
        internalRatePerM3:    batchingInternalSales.internalRatePerM3,
        totalInternalRevenue: batchingInternalSales.totalInternalRevenue,
        isDeliveryFlagged:    concreteDeliveryReceipts.isDeliveryFlagged,
      })
      .from(batchingInternalSales)
      .leftJoin(projects, eq(batchingInternalSales.projectId, projects.id))
      .leftJoin(projectUnits, eq(batchingInternalSales.unitId, projectUnits.id))
      .leftJoin(concreteDeliveryReceipts, eq(batchingInternalSales.deliveryReceiptId, concreteDeliveryReceipts.id))
      .orderBy(desc(batchingInternalSales.transactionDate)),

    db
      .select({
        totalVolume:  sql<string>`COALESCE(SUM(${batchingInternalSales.volumeM3}), 0)`,
        totalRevenue: sql<string>`COALESCE(SUM(${batchingInternalSales.totalInternalRevenue}), 0)`,
        txCount:      sql<string>`COUNT(*)`,
        flaggedCount: sql<string>`COUNT(*) FILTER (WHERE ${concreteDeliveryReceipts.isDeliveryFlagged} = true)`,
      })
      .from(batchingInternalSales)
      .leftJoin(concreteDeliveryReceipts, eq(batchingInternalSales.deliveryReceiptId, concreteDeliveryReceipts.id)),
  ]);

  const t = totals[0];

  const kpis = [
    { label: "Total Transactions", value: Number(t.txCount).toLocaleString() },
    { label: "Total Volume Billed", value: `${Number(t.totalVolume).toFixed(2)} m³` },
    { label: "Total IDB Revenue", value: PHP.format(Number(t.totalRevenue)) },
    { label: "Flagged Deliveries", value: Number(t.flaggedCount).toLocaleString(), warn: Number(t.flaggedCount) > 0 },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>

      <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>← Back to Batching</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Internal Sales (IDB)</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
              Inter-departmental billing records. Each entry debits a Project Cost Center and credits Batching Plant Internal Revenue.
            </p>
          </div>
          <a href="/batching/deliver" style={{
            padding: "0.5rem 1rem", background: ACCENT, color: "#fff",
            borderRadius: "7px", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
          }}>
            Pending Deliveries →
          </a>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{
              background: "#fff", borderRadius: "10px", padding: "1.1rem 1.25rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              borderLeft: k.warn ? "4px solid #dc2626" : `4px solid ${ACCENT}`,
            }}>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", fontWeight: 600, marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {k.label}
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: k.warn ? "#dc2626" : "#111827" }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>

        {/* IDB note */}
        <div style={{
          marginBottom: "1.25rem", padding: "0.75rem 1rem",
          background: "#f3e8ff", border: "1px solid #e9d5ff",
          borderRadius: "8px", fontSize: "0.8rem", color: "#6b21a8",
        }}>
          <strong>Accounting Treatment:</strong> Each IDB entry is a net-zero internal transfer — Project P&amp;L is debited,
          Batching Plant Internal Revenue is credited. These are eliminated in consolidated reporting.
        </div>

        {sales.length === 0 ? (
          <div style={{
            padding: "3rem", background: "#fff", borderRadius: "10px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af",
          }}>
            No IDB records yet. Records are created automatically when a site engineer signs a delivery receipt.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Date", "Project", "Unit", "Volume (m³)", "Rate / m³", "IDB Total", "Status"].map((h, i) => (
                      <th key={i} style={{
                        padding: "0.65rem 1rem", fontWeight: 600, color: "#374151",
                        textAlign: [3, 4, 5].includes(i) ? "right" : "left", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                        {s.transactionDate}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151" }}>
                        {s.projectName ?? "—"}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: ACCENT }}>
                        {s.unitCode ?? "—"}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "#374151" }}>
                        {Number(s.volumeM3).toFixed(2)}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>
                        {PHP.format(Number(s.internalRatePerM3))}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>
                        {PHP.format(Number(s.totalInternalRevenue))}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {s.isDeliveryFlagged ? (
                          <span style={{ padding: "0.15rem 0.45rem", background: "#fef2f2", color: "#dc2626", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700 }}>
                            FLAGGED
                          </span>
                        ) : (
                          <span style={{ padding: "0.15rem 0.45rem", background: "#ecfdf5", color: "#057a55", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700 }}>
                            POSTED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                    <td colSpan={3} style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 700, color: "#374151" }}>
                      TOTAL
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#374151" }}>
                      {Number(t.totalVolume).toFixed(2)}
                    </td>
                    <td />
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>
                      {PHP.format(Number(t.totalRevenue))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
