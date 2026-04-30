export const dynamic = "force-dynamic";
import { db } from "@/db";
import { requestsForPayment, bankAccounts, costCenters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { RfpActions } from "./RfpActions";

const ACCENT = "#ff5a1f";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:        { bg: "#fffbeb", color: "#b45309" },
  FIRST_APPROVED: { bg: "#eff6ff", color: "#1a56db" },
  APPROVED:       { bg: "#f0fdf4", color: "#057a55" },
  REJECTED:       { bg: "#fef2f2", color: "#e02424" },
};

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function RfpDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [rfp] = await db
    .select({
      id:                requestsForPayment.id,
      amount:            requestsForPayment.amount,
      payeeName:         requestsForPayment.payeeName,
      purpose:           requestsForPayment.purpose,
      sourceDocumentUrl: requestsForPayment.sourceDocumentUrl,
      status:            requestsForPayment.status,
      rejectionReason:   requestsForPayment.rejectionReason,
      createdAt:         requestsForPayment.createdAt,
      firstApprovalAt:   requestsForPayment.firstApprovalAt,
      finalApprovalAt:   requestsForPayment.finalApprovalAt,
      bankName:          bankAccounts.bankName,
      accountNumber:     bankAccounts.accountNumber,
      costCenterName:    costCenters.name,
      costCenterCode:    costCenters.code,
    })
    .from(requestsForPayment)
    .leftJoin(bankAccounts, eq(requestsForPayment.bankAccountId, bankAccounts.id))
    .leftJoin(costCenters,  eq(requestsForPayment.costCenterId,  costCenters.id))
    .where(eq(requestsForPayment.id, id));

  if (!rfp) notFound();

  const st = STATUS_STYLE[rfp.status] ?? STATUS_STYLE.PENDING;
  const fmt = (v: string | null) =>
    v != null ? `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";

  // Two-level approval pipeline
  const steps = [
    { label: "Submitted", done: true, at: rfp.createdAt },
    { label: "First Approval", done: !!rfp.firstApprovalAt, at: rfp.firstApprovalAt },
    { label: "Final Approval", done: !!rfp.finalApprovalAt, at: rfp.finalApprovalAt },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance/rfp" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Requests for Payment</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Request for Payment</h1>
            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: st.bg, color: st.color }}>
              {rfp.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {rfp.rejectionReason && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "1rem 1.25rem", marginBottom: "1.5rem", color: "#b91c1c", fontSize: "0.875rem" }}>
            <strong>Rejection reason:</strong> {rfp.rejectionReason}
          </div>
        )}

        {/* Approval pipeline */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0", alignItems: "center" }}>
            {steps.map((s, i) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: s.done ? "#057a55" : "#f3f4f6", color: s.done ? "#fff" : "#9ca3af", fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                    {s.done ? "✓" : i + 1}
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: s.done ? "#057a55" : "#9ca3af", textAlign: "center" }}>{s.label}</div>
                  {s.at && <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: "0.1rem" }}>{new Date(s.at).toLocaleDateString("en-PH")}</div>}
                </div>
                {i < steps.length - 1 && (
                  <div style={{ height: "2px", flex: 0.5, background: steps[i + 1].done ? "#057a55" : "#e5e7eb", marginBottom: "28px" }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Payment Details</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>Payee</span>
              <span style={{ fontWeight: 700 }}>{rfp.payeeName}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>Amount</span>
              <span style={{ fontWeight: 700, fontFamily: "monospace", color: ACCENT, fontSize: "1.1rem" }}>{fmt(rfp.amount)}</span>
            </div>
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem", color: "#374151" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.35rem" }}>PURPOSE</div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{rfp.purpose}</div>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}><div style={LABEL}>Bank Account</div><div style={VALUE}>{rfp.bankName ? `${rfp.bankName} (${rfp.accountNumber})` : "—"}</div></div>
            <div style={FIELD}><div style={LABEL}>Cost Center</div><div style={VALUE}>{rfp.costCenterName ? `${rfp.costCenterCode} — ${rfp.costCenterName}` : "—"}</div></div>
            <div style={FIELD}><div style={LABEL}>Submitted</div><div style={VALUE}>{new Date(rfp.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div></div>
            <div style={FIELD}>
              <div style={LABEL}>Source Document</div>
              <a href={rfp.sourceDocumentUrl} target="_blank" rel="noopener noreferrer" style={{ ...VALUE, color: "#6366f1", textDecoration: "none", fontSize: "0.82rem" }}>
                View Document →
              </a>
            </div>
          </div>
        </div>

        {/* Actions */}
        {rfp.status !== "APPROVED" && rfp.status !== "REJECTED" && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Actions</h2>
            <RfpActions id={rfp.id} status={rfp.status} />
          </div>
        )}
      </div>
    </main>
  );
}
