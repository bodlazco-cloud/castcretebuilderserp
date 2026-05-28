export const dynamic = "force-dynamic";

import { db } from "@/db";
import { payables, projects, subcontractors } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const ACCENT = "#057a55";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:          { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW: { bg: "#fef9c3", color: "#713f12" },
  APPROVED:       { bg: "#dcfce7", color: "#166534" },
  REJECTED:       { bg: "#fef2f2", color: "#b91c1c" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safe(fn: () => Promise<any[]>): Promise<any[]> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout")), 6000)
    ),
  ]);
}

function fmt(v: string | null | undefined): string {
  if (v == null) return "—";
  return `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function fmtDate(v: Date | null | undefined): string {
  if (!v) return "";
  return new Date(v).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export default async function BillsPage() {
  const rows = await safe(() =>
    db
      .select({
        id: payables.id,
        status: payables.status,
        grossAmount: payables.grossAmount,
        lessAdvanceRecoupment: payables.lessAdvanceRecoupment,
        netPayable: payables.netPayable,
        auditVerifiedAt: payables.auditVerifiedAt,
        bodApprovedAt: payables.bodApprovedAt,
        paidAt: payables.paidAt,
        rejectionReason: payables.rejectionReason,
        createdAt: payables.createdAt,
        projectName: projects.name,
        subconName: subcontractors.name,
      })
      .from(payables)
      .leftJoin(projects, eq(payables.projectId, projects.id))
      .leftJoin(subcontractors, eq(payables.subconId, subcontractors.id))
      .orderBy(desc(payables.createdAt))
      .limit(200)
  );

  const totalGross = rows.reduce((s, r) => s + Number(r.grossAmount), 0);
  const totalNetPayable = rows.reduce((s, r) => s + Number(r.netPayable ?? 0), 0);
  const totalPaid = rows
    .filter((r) => !!r.paidAt)
    .reduce((s, r) => s + Number(r.netPayable ?? 0), 0);
  const pending = rows.filter((r) => !r.paidAt && r.status !== "REJECTED").length;

  const kpis = [
    { label: "Total Payables", value: String(rows.length), accent: ACCENT },
    { label: "Pending Payment", value: String(pending), accent: "#e3a008" },
    { label: "Total Net Payable", value: `₱${totalNetPayable.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, accent: "#dc2626" },
    { label: "Total Paid", value: `₱${totalPaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, accent: "#1a56db" },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none", fontWeight: 500 }}>
            ← Finance & Accounting
          </a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.6rem", fontWeight: 700, color: "#111827" }}>Bills</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            Payables to subcontractors — {rows.length} record{rows.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
          {kpis.map((k) => (
            <div
              key={k.label}
              style={{
                background: "#fff",
                borderRadius: "8px",
                padding: "1rem 1.25rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                borderLeft: `4px solid ${k.accent}`,
              }}
            >
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>{k.value}</div>
              <div style={{ fontSize: "0.775rem", color: "#6b7280", marginTop: "0.2rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              padding: "4rem 2rem",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: "0.9rem",
            }}
          >
            No bills recorded yet. Bills are generated from approved work accomplished reports.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", minWidth: "1000px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["#", "Project", "Subcontractor", "Gross", "Advance Recoup", "Net Payable", "Audit", "BOD Approved", "Paid", "Status"].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "0.75rem 1rem",
                          textAlign: i >= 3 && i <= 5 ? "right" : "left",
                          fontWeight: 600,
                          color: "#374151",
                          borderBottom: "1px solid #e5e7eb",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    const isPaidApproved = r.status === "APPROVED" && !!r.paidAt;
                    const isRejected = r.status === "REJECTED";
                    const rowBg = isPaidApproved ? "#f0fdf4" : isRejected ? "#fef2f2" : undefined;

                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: rowBg }}>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                          #{r.id.slice(0, 8)}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151", whiteSpace: "nowrap" }}>
                          {r.projectName ?? "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", whiteSpace: "nowrap" }}>
                          {r.subconName ?? "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          {fmt(r.grossAmount)}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {Number(r.lessAdvanceRecoupment) > 0 ? `(${fmt(r.lessAdvanceRecoupment)})` : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {fmt(r.netPayable)}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                          {r.auditVerifiedAt ? (
                            <span style={{ color: "#374151" }}>{fmtDate(r.auditVerifiedAt)}</span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                          {r.bodApprovedAt ? (
                            <span style={{ color: "#374151" }}>{fmtDate(r.bodApprovedAt)}</span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                          {r.paidAt ? (
                            <span style={{ color: "#057a55" }}>{fmtDate(r.paidAt)}</span>
                          ) : (
                            <span style={{ color: "#b45309", background: "#fef3c7", padding: "0.15rem 0.45rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.2rem 0.55rem",
                              borderRadius: "999px",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              background: st.bg,
                              color: st.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.status.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "#6b7280" }}>
              <span>{rows.length} record{rows.length !== 1 ? "s" : ""}</span>
              <span>Total Gross: <strong style={{ color: "#111827" }}>{`₱${totalGross.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}</strong></span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
