export const dynamic = "force-dynamic";
import { db } from "@/db";
import { requestsForPayment, bankAccounts, costCenters } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#ff5a1f";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:        { bg: "#fffbeb", color: "#b45309" },
  FIRST_APPROVED: { bg: "#eff6ff", color: "#1a56db" },
  APPROVED:       { bg: "#f0fdf4", color: "#057a55" },
  REJECTED:       { bg: "#fef2f2", color: "#e02424" },
};

export default async function RfpPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:                requestsForPayment.id,
      amount:            requestsForPayment.amount,
      payeeName:         requestsForPayment.payeeName,
      purpose:           requestsForPayment.purpose,
      status:            requestsForPayment.status,
      createdAt:         requestsForPayment.createdAt,
      firstApprovalAt:   requestsForPayment.firstApprovalAt,
      finalApprovalAt:   requestsForPayment.finalApprovalAt,
      rejectionReason:   requestsForPayment.rejectionReason,
      bankName:          bankAccounts.bankName,
      costCenterName:    costCenters.name,
    })
    .from(requestsForPayment)
    .leftJoin(bankAccounts,  eq(requestsForPayment.bankAccountId, bankAccounts.id))
    .leftJoin(costCenters,   eq(requestsForPayment.costCenterId,  costCenters.id))
    .orderBy(desc(requestsForPayment.createdAt));

  const pending  = rows.filter((r) => r.status === "PENDING").length;
  const partial  = rows.filter((r) => r.status === "FIRST_APPROVED").length;
  const approved = rows.filter((r) => r.status === "APPROVED").length;

  const fmt = (v: string | null) =>
    v != null ? `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Requests for Payment</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {pending} pending · {partial} awaiting final approval · {approved} approved
            </p>
          </div>
          <a href="/finance/rfp/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ New RFP</a>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No requests for payment yet. <a href="/finance/rfp/new" style={{ color: ACCENT }}>Create first RFP →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "780px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Payee", "Purpose", "Amount", "Bank Account", "Cost Center", "Status", "Submitted", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 2 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.PENDING;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151" }}>{r.payeeName}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.purpose}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(r.amount)}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.bankName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.costCenterName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {r.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{new Date(r.createdAt).toLocaleDateString("en-PH")}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/finance/rfp/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
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
