export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, ne, desc, count, inArray, notInArray, or } from "drizzle-orm";

export default async function FinancePage() {
  let user = null;
  try {
    user = await getAuthUser();
  } catch {}

  const deptCode: string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";

  const [
    outstandingInvoicesResult,
    pendingPayablesResult,
    pendingPaymentRequestsResult,
    manualVouchersPendingResult,
    invoiceRows,
    payableRows,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(schema.invoices)
      .where(notInArray(schema.invoices.status, ["COLLECTED", "REJECTED"])),
    db
      .select({ value: count() })
      .from(schema.payables)
      .where(notInArray(schema.payables.status, ["APPROVED", "CANCELLED"])),
    db
      .select({ value: count() })
      .from(schema.paymentRequests)
      .where(eq(schema.paymentRequests.status, "PENDING")),
    db
      .select({ value: count() })
      .from(schema.manualVouchers)
      .where(inArray(schema.manualVouchers.status, ["DRAFT", "PENDING_REVIEW"])),
    db
      .select({
        invoiceId: schema.invoices.id,
        projectName: schema.projects.name,
        grossAccomplishment: schema.invoices.grossAccomplishment,
        lessDpRecovery: schema.invoices.lessDpRecovery,
        lessOsmDeduction: schema.invoices.lessOsmDeduction,
        lessRetention: schema.invoices.lessRetention,
        netAmountDue: schema.invoices.netAmountDue,
        status: schema.invoices.status,
        generatedAt: schema.invoices.generatedAt,
      })
      .from(schema.invoices)
      .leftJoin(schema.projects, eq(schema.invoices.projectId, schema.projects.id))
      .orderBy(desc(schema.invoices.generatedAt))
      .limit(10),
    db
      .select({
        payableId: schema.payables.id,
        subcontractorName: schema.subcontractors.name,
        grossAmount: schema.payables.grossAmount,
        lessAdvanceRecoupment: schema.payables.lessAdvanceRecoupment,
        netPayable: schema.payables.netPayable,
        status: schema.payables.status,
        createdAt: schema.payables.createdAt,
      })
      .from(schema.payables)
      .leftJoin(schema.subcontractors, eq(schema.payables.subconId, schema.subcontractors.id))
      .orderBy(desc(schema.payables.createdAt))
      .limit(10),
  ]);

  const outstandingInvoices = Number(outstandingInvoicesResult[0]?.value ?? 0);
  const pendingPayables = Number(pendingPayablesResult[0]?.value ?? 0);
  const pendingPaymentRequests = Number(pendingPaymentRequestsResult[0]?.value ?? 0);
  const manualVouchersPending = Number(manualVouchersPendingResult[0]?.value ?? 0);

  const accent = "#ff5a1f";

  const kpis = [
    { label: "Outstanding Invoices", value: outstandingInvoices },
    { label: "Pending Payables", value: pendingPayables },
    { label: "Pending Payment Requests", value: pendingPaymentRequests },
    { label: "Manual Vouchers Pending", value: manualVouchersPending },
  ];

  const thStyle: React.CSSProperties = {
    padding: "0.65rem 1rem",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "0.65rem 1rem",
    fontSize: "0.875rem",
    color: "#111827",
    borderBottom: "1px solid #f3f4f6",
    whiteSpace: "nowrap",
  };

  const invoiceStatusColors: Record<string, { bg: string; text: string }> = {
    DRAFT:           { bg: "#f9fafb", text: "#6b7280" },
    SUBMITTED:       { bg: "#eff6ff", text: "#1a56db" },
    COLLECTED:       { bg: "#f0fdf4", text: "#057a55" },
    REJECTED:        { bg: "#fef2f2", text: "#e02424" },
    PENDING_REVIEW:  { bg: "#fffbeb", text: "#e3a008" },
    APPROVED:        { bg: "#ecfdf5", text: "#057a55" },
  };

  const payableStatusColors: Record<string, { bg: string; text: string }> = {
    DRAFT:                { bg: "#f9fafb", text: "#6b7280" },
    PENDING_REVIEW:       { bg: "#fffbeb", text: "#e3a008" },
    PENDING_AUDIT:        { bg: "#fef3c7", text: "#b45309" },
    READY_FOR_APPROVAL:   { bg: "#eff6ff", text: "#1a56db" },
    APPROVED:             { bg: "#f0fdf4", text: "#057a55" },
    REJECTED:             { bg: "#fef2f2", text: "#e02424" },
    CANCELLED:            { bg: "#f3f4f6", text: "#9ca3af" },
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        height: "56px",
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
          <span style={{
            padding: "0.15rem 0.6rem",
            background: "#fff7ed",
            color: accent,
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}>
            Finance & Accounting
          </span>
        </div>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              {displayName}
              {deptCode && (
                <span style={{
                  marginLeft: "0.5rem",
                  padding: "0.15rem 0.5rem",
                  background: "#e0e7ff",
                  color: "#3730a3",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}>
                  {deptCode}
                </span>
              )}
            </span>
            <form method="POST" action="/auth/logout" style={{ margin: 0 }}>
              <button
                type="submit"
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.8rem",
                  background: "transparent",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "#374151",
                }}
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </nav>

      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.75rem" }}>
          <a
            href="/dashboard"
            style={{
              fontSize: "0.85rem",
              color: accent,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            ← Back to Dashboard
          </a>
        </div>

        <header style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
              Finance & Accounting
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Invoices · Payables · Cash Flow
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <a href="/procurement/price-change" style={{
              padding: "0.55rem 1rem", borderRadius: "6px",
              background: "#fff", color: "#ff5a1f", fontSize: "0.82rem", fontWeight: 600,
              textDecoration: "none", border: "1px solid #ff5a1f",
            }}>Approve Price Changes</a>
          </div>
        </header>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}>
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: "#fff",
                borderRadius: "8px",
                padding: "1.25rem 1.5rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                borderTop: `3px solid ${accent}`,
              }}
            >
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                {kpi.value.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.4rem" }}>
                {kpi.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          marginBottom: "2rem",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <span style={{
              width: "4px",
              height: "18px",
              background: accent,
              borderRadius: "2px",
              display: "inline-block",
            }} />
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
              Invoices
            </h2>
            <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#9ca3af" }}>
              10 most recent
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Project</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Gross Amount</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>DP Recovery</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>OSM Deduction</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Retention</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Net Amount Due</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af", padding: "2rem" }}>
                      No records yet
                    </td>
                  </tr>
                ) : (
                  invoiceRows.map((row) => {
                    const sc = invoiceStatusColors[row.status] ?? { bg: "#f3f4f6", text: "#6b7280" };
                    const fmt = (v: string | null) =>
                      v != null ? `PHP ${Number(v).toLocaleString()}` : "—";
                    return (
                      <tr key={row.invoiceId}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{row.projectName ?? "—"}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>
                          {fmt(row.grossAccomplishment)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>
                          {fmt(row.lessDpRecovery)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>
                          {fmt(row.lessOsmDeduction)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>
                          {fmt(row.lessRetention)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                          {fmt(row.netAmountDue)}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: sc.bg,
                            color: sc.text,
                          }}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <span style={{
              width: "4px",
              height: "18px",
              background: accent,
              borderRadius: "2px",
              display: "inline-block",
            }} />
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
              Payables
            </h2>
            <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#9ca3af" }}>
              10 most recent
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Subcontractor</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Gross Amount</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Advance Recoupment</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Net Payable</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payableRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af", padding: "2rem" }}>
                      No records yet
                    </td>
                  </tr>
                ) : (
                  payableRows.map((row) => {
                    const sc = payableStatusColors[row.status] ?? { bg: "#f3f4f6", text: "#6b7280" };
                    const fmt = (v: string | null) =>
                      v != null ? `PHP ${Number(v).toLocaleString()}` : "—";
                    return (
                      <tr key={row.payableId}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{row.subcontractorName ?? "—"}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>
                          {fmt(row.grossAmount)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>
                          {fmt(row.lessAdvanceRecoupment)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                          {fmt(row.netPayable)}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: sc.bg,
                            color: sc.text,
                          }}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
