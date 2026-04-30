export const dynamic = "force-dynamic";
import { db } from "@/db";
import { purchaseOrders, projects, suppliers, purchaseRequisitions } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#7e3af2";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  AUDIT_REVIEW: { bg: "#ede9fe", color: "#5b21b6" },
  BOD_APPROVED: { bg: "#e0e7ff", color: "#3730a3" },
};

export default async function PoCompliancePage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:              purchaseOrders.id,
      totalAmount:     purchaseOrders.totalAmount,
      status:          purchaseOrders.status,
      isPrepaid:       purchaseOrders.isPrepaid,
      createdAt:       purchaseOrders.createdAt,
      auditReviewedAt: purchaseOrders.auditReviewedAt,
      bodApprovedAt:   purchaseOrders.bodApprovedAt,
      prId:            purchaseOrders.prId,
      projName:        projects.name,
      projId:          projects.id,
      supplierName:    suppliers.name,
    })
    .from(purchaseOrders)
    .leftJoin(projects,   eq(purchaseOrders.projectId,  projects.id))
    .leftJoin(suppliers,  eq(purchaseOrders.supplierId, suppliers.id))
    .where(inArray(purchaseOrders.status, ["AUDIT_REVIEW", "BOD_APPROVED"]))
    .orderBy(desc(purchaseOrders.createdAt));

  const pendingAudit = rows.filter((r) => r.status === "AUDIT_REVIEW").length;
  const cleared      = rows.filter((r) => r.status === "BOD_APPROVED").length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Audit & Quality</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>PO Compliance</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {pendingAudit} pending audit review · {cleared} audit-cleared (awaiting BOD)
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No POs currently in the audit pipeline. POs reach here when procurement sends them for review.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Supplier", "Total", "Prepaid", "Status", "Created", "Audit Cleared", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 2 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.AUDIT_REVIEW;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500 }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.supplierName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 700, color: "#111827" }}>
                          PHP {Number(r.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {r.isPrepaid
                            ? <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#92400e", background: "#fef3c7", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>YES</span>
                            : <span style={{ color: "#9ca3af" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {r.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{new Date(r.createdAt).toLocaleDateString("en-PH")}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>
                          {r.auditReviewedAt ? new Date(r.auditReviewedAt).toLocaleDateString("en-PH") : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/audit/po-compliance/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>Review →</a>
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
