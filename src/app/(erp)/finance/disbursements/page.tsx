export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  paymentRequests, manualVouchers, payables,
  subcontractors, purchaseOrders, suppliers,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { ReleaseActions } from "./ReleaseActions";

const ACCENT = "#ff5a1f";
const DUAL_AUTH_THRESHOLD = 50_000;

export type DisbRow = {
  id:               string;
  amount:           string;
  requestType:      string;
  status:           string;
  createdAt:        Date;
  requestedBy:      string;
  requiresDualAuth: boolean;
  // payee / reference resolved from linked records
  payeeName:        string | null;
  reference:        string | null;
  supportingDocUrl: string | null;
};

export default async function DisbursementsPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:               paymentRequests.id,
      amount:           paymentRequests.amount,
      requestType:      paymentRequests.requestType,
      status:           paymentRequests.status,
      createdAt:        paymentRequests.createdAt,
      requestedBy:      paymentRequests.requestedBy,
      // Voucher path
      voucherDesc:      manualVouchers.description,
      supportingDocUrl: manualVouchers.supportingDocUrl,
      // Payable → subcontractor path
      subconName:       subcontractors.name,
      // PO → supplier path
      supplierName:     suppliers.name,
      poRequiresDual:   purchaseOrders.requiresDualAuth,
    })
    .from(paymentRequests)
    .leftJoin(manualVouchers,  eq(paymentRequests.voucherId,  manualVouchers.id))
    .leftJoin(payables,        eq(paymentRequests.payableId,  payables.id))
    .leftJoin(subcontractors,  eq(payables.subconId,          subcontractors.id))
    .leftJoin(purchaseOrders,  eq(paymentRequests.poId,       purchaseOrders.id))
    .leftJoin(suppliers,       eq(purchaseOrders.supplierId,  suppliers.id))
    .where(eq(paymentRequests.status, "PENDING"))
    .orderBy(desc(paymentRequests.createdAt))
    .limit(50);

  const disbRows: DisbRow[] = rows.map((r) => ({
    id:           r.id,
    amount:       r.amount,
    requestType:  r.requestType,
    status:       r.status,
    createdAt:    r.createdAt,
    requestedBy:  r.requestedBy,
    requiresDualAuth:
      Boolean(r.poRequiresDual) || Number(r.amount) >= DUAL_AUTH_THRESHOLD,
    payeeName:
      r.subconName ?? r.supplierName ?? r.voucherDesc ?? null,
    reference:
      r.voucherDesc ?? (r.poRequiresDual != null ? `PO-${r.id.slice(0, 8).toUpperCase()}` : null),
    supportingDocUrl: r.supportingDocUrl,
  }));

  const dualAuthCount = disbRows.filter((r) => r.requiresDualAuth).length;
  const fmt = (v: string) =>
    `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
            Payment Release Queue
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            {disbRows.length} pending · Dual-auth required on {dualAuthCount} item{dualAuthCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Dual-auth security notice */}
        {dualAuthCount > 0 && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "0.75rem",
            padding: "0.9rem 1.1rem", marginBottom: "1.25rem",
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px",
          }}>
            <span style={{ fontSize: "1.1rem", marginTop: "0.05rem" }}>🔒</span>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#b91c1c" }}>
              <strong>Security Notice:</strong> Transactions of ₱50,000 or more require dual
              authorization. The preparer cannot authorize the same voucher (Segregation of Duties).
            </p>
          </div>
        )}

        {disbRows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No pending payment requests.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Payee / Description", "Type", "Amount (PHP)", "Source Doc", "Auth Required", "Submitted", "Action"].map((h, i) => (
                      <th key={i} style={{
                        padding: "0.75rem 1rem", textAlign: i === 2 ? "right" : "left",
                        fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb",
                        fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {disbRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <p style={{ margin: "0 0 0.1rem", fontWeight: 600, color: "#111827" }}>
                          {row.payeeName ?? "—"}
                        </p>
                        {row.reference && (
                          <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }}>
                            {row.reference}
                          </p>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#6b7280", fontSize: "0.8rem" }}>
                        {row.requestType}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>
                        {fmt(row.amount)}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {row.supportingDocUrl ? (
                          <a href={row.supportingDocUrl} target="_blank" rel="noopener noreferrer"
                            style={{ color: "#1d4ed8", fontSize: "0.8rem", textDecoration: "none", fontWeight: 500 }}>
                            View PDF
                          </a>
                        ) : (
                          <span style={{ color: "#d97706", fontSize: "0.78rem", fontWeight: 600 }}>Missing</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {row.requiresDualAuth ? (
                          <span style={{
                            display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px",
                            fontSize: "0.7rem", fontWeight: 700, background: "#fef2f2", color: "#b91c1c",
                          }}>
                            DUAL-AUTH
                          </span>
                        ) : (
                          <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>Standard</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#6b7280", fontSize: "0.8rem" }}>
                        {new Date(row.createdAt).toLocaleDateString("en-PH")}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <ReleaseActions
                          paymentRequestId={row.id}
                          requiresDualAuth={row.requiresDualAuth}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
