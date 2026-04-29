export const dynamic = "force-dynamic";
import { db } from "@/db";
import { materialReceivingReports, mrrItems, projects, suppliers, materials, purchaseOrders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

const ACCENT = "#e3a008";

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

const SOURCE_LABELS: Record<string, string> = {
  SUPPLIER:      "From Supplier",
  DEVELOPER_OSM: "Developer OSM",
};

export default async function MrrDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [mrr] = await db
    .select({
      id:           materialReceivingReports.id,
      sourceType:   materialReceivingReports.sourceType,
      receivedDate: materialReceivingReports.receivedDate,
      status:       materialReceivingReports.status,
      notes:        materialReceivingReports.notes,
      createdAt:    materialReceivingReports.createdAt,
      poId:         materialReceivingReports.poId,
      projId:       projects.id,
      projName:     projects.name,
      supplierName: suppliers.name,
    })
    .from(materialReceivingReports)
    .leftJoin(projects,  eq(materialReceivingReports.projectId,  projects.id))
    .leftJoin(suppliers, eq(materialReceivingReports.supplierId, suppliers.id))
    .where(eq(materialReceivingReports.id, id));

  if (!mrr) notFound();

  const items = await db
    .select({
      id:               mrrItems.id,
      quantityReceived: mrrItems.quantityReceived,
      unitPrice:        mrrItems.unitPrice,
      shadowPrice:      mrrItems.shadowPrice,
      matCode:          materials.code,
      matName:          materials.name,
      matUnit:          materials.unit,
    })
    .from(mrrItems)
    .leftJoin(materials, eq(mrrItems.materialId, materials.id))
    .where(eq(mrrItems.mrrId, id));

  const totalValue = items.reduce((s, i) => s + Number(i.quantityReceived) * Number(i.unitPrice), 0);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement/receipts-and-transfers" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Receipts & Transfers</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Material Receiving Report</h1>
            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#fef9c3", color: "#713f12" }}>
              {mrr.status}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#111827" }}>
              PHP {totalValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>Receipt value</div>
          </div>
        </div>

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}>
              <div style={LABEL}>Project</div>
              {mrr.projId
                ? <a href={`/master-list/projects/${mrr.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{mrr.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Source</div>
              <div style={VALUE}>{SOURCE_LABELS[mrr.sourceType] ?? mrr.sourceType}</div>
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Received Date</div>
              <div style={VALUE}>{mrr.receivedDate}</div>
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Supplier</div>
              <div style={VALUE}>{mrr.supplierName ?? "—"}</div>
            </div>
            {mrr.poId && (
              <div style={FIELD}>
                <div style={LABEL}>Linked PO</div>
                <a href={`/procurement/po/${mrr.poId}`} style={{ ...VALUE, color: ACCENT, textDecoration: "none" }}>View PO →</a>
              </div>
            )}
            {mrr.notes && (
              <div style={{ ...FIELD, gridColumn: "span 3" }}>
                <div style={LABEL}>Notes</div>
                <div style={{ ...VALUE, fontSize: "0.875rem", color: "#374151" }}>{mrr.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
            Received Materials ({items.length})
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Material", "Unit", "Qty Received", "Unit Price", "Shadow Price", "Line Value"].map((h, i) => (
                    <th key={i} style={{ padding: "0.65rem 0.75rem", textAlign: i >= 2 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 600 }}>{item.matCode}</span>
                      <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>{item.matName}</div>
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#6b7280" }}>{item.matUnit}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 700 }}>{Number(item.quantityReceived).toFixed(4)}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#374151" }}>
                      PHP {Number(item.unitPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#6b7280" }}>
                      PHP {Number(item.shadowPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 700 }}>
                      PHP {(Number(item.quantityReceived) * Number(item.unitPrice)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                  <td colSpan={5} style={{ padding: "0.65rem 0.75rem", textAlign: "right", fontWeight: 700, fontSize: "0.875rem" }}>Total</td>
                  <td style={{ padding: "0.65rem 0.75rem", textAlign: "right", fontWeight: 700 }}>
                    PHP {totalValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
