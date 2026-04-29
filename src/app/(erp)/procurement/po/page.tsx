export const dynamic = "force-dynamic";
import { db } from "@/db";
import { purchaseOrders, projects, suppliers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#e3a008";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:               { bg: "#f3f4f6", color: "#6b7280" },
  AUDIT_REVIEW:        { bg: "#eff6ff", color: "#1e40af" },
  BOD_APPROVED:        { bg: "#e0e7ff", color: "#3730a3" },
  PREPAID_REQUIRED:    { bg: "#fef9c3", color: "#713f12" },
  AWAITING_DELIVERY:   { bg: "#fef3c7", color: "#92400e" },
  PARTIALLY_DELIVERED: { bg: "#fff7ed", color: "#c2410c" },
  DELIVERED:           { bg: "#dcfce7", color: "#166534" },
  CANCELLED:           { bg: "#fef2f2", color: "#b91c1c" },
};

export default async function PurchaseOrdersPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:           purchaseOrders.id,
      totalAmount:  purchaseOrders.totalAmount,
      status:       purchaseOrders.status,
      isPrepaid:    purchaseOrders.isPrepaid,
      createdAt:    purchaseOrders.createdAt,
      deliveredAt:  purchaseOrders.deliveredAt,
      bodApprovedAt: purchaseOrders.bodApprovedAt,
      projName:     projects.name,
      projId:       projects.id,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .leftJoin(projects,   eq(purchaseOrders.projectId,   projects.id))
    .leftJoin(suppliers,  eq(purchaseOrders.supplierId,  suppliers.id))
    .orderBy(desc(purchaseOrders.createdAt));

  const totalValue = rows.reduce((s, r) => s + Number(r.totalAmount), 0);
  const pending = rows.filter((r) => ["AUDIT_REVIEW", "BOD_APPROVED", "AWAITING_DELIVERY"].includes(r.status)).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Procurement & Stock</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Purchase Orders</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {rows.length} POs — PHP {totalValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })} total, {pending} in progress
            </p>
          </div>
        </div>

        {/* Status pills */}
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {Object.entries(STATUS_STYLE).map(([s, st]) => {
              const c = rows.filter((r) => r.status === s).length;
              if (c === 0) return null;
              return (
                <span key={s} style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, background: st.bg, color: st.color }}>
                  {s.replace(/_/g, " ")}: {c}
                </span>
              );
            })}
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No POs yet. POs are created from approved PRs. <a href="/procurement/pr" style={{ color: ACCENT }}>View PRs →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Supplier", "Total Amount", "Status", "Created", "Delivered", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 2 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.DRAFT;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500 }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.supplierName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 700, color: "#111827" }}>
                          PHP {Number(r.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                            <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                              {r.status.replace(/_/g, " ")}
                            </span>
                            {r.isPrepaid && <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#92400e", background: "#fef3c7", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>PREPAID</span>}
                          </div>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{new Date(r.createdAt).toLocaleDateString("en-PH")}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>
                          {r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString("en-PH") : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/procurement/po/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
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
