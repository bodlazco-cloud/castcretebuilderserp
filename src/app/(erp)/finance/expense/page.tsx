export const dynamic = "force-dynamic";

import { db } from "@/db";
import { manualVouchers, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const ACCENT = "#057a55";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:          { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW: { bg: "#fef9c3", color: "#713f12" },
  APPROVED:       { bg: "#dcfce7", color: "#166534" },
  REJECTED:       { bg: "#fef2f2", color: "#b91c1c" },
};

export default async function ExpensePage() {
  const rows = await safe(
    db.select({
      id: manualVouchers.id,
      description: manualVouchers.description,
      amount: manualVouchers.amount,
      requiresBodApproval: manualVouchers.requiresBodApproval,
      supportingDocUrl: manualVouchers.supportingDocUrl,
      status: manualVouchers.status,
      approvedAt: manualVouchers.approvedAt,
      paidAt: manualVouchers.paidAt,
      createdAt: manualVouchers.createdAt,
      projectName: projects.name,
    })
      .from(manualVouchers)
      .leftJoin(projects, eq(manualVouchers.projectId, projects.id))
      .orderBy(desc(manualVouchers.createdAt))
      .limit(200),
    [] as {
      id: string;
      description: string;
      amount: string;
      requiresBodApproval: boolean;
      supportingDocUrl: string | null;
      status: string;
      approvedAt: Date | null;
      paidAt: Date | null;
      createdAt: Date;
      projectName: string | null;
    }[]
  );

  const totalAmount = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (r.paidAt ? Number(r.amount ?? 0) : 0), 0);
  const pending = rows.filter((r) => !r.paidAt && r.status !== "REJECTED").length;
  const bodRequired = rows.filter((r) => r.requiresBodApproval).length;

  const fmtAmt = (v: string | number | null) =>
    v != null
      ? `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
      : "—";

  const fmtDate = (v: string | Date | null) =>
    v ? new Date(v).toLocaleDateString("en-PH") : null;

  const kpis = [
    { label: "Total Vouchers", value: String(rows.length), accent: ACCENT },
    { label: "Pending Payment", value: String(pending), accent: "#e3a008" },
    { label: "BOD Required", value: String(bodRequired), accent: "#dc2626" },
    {
      label: "Total Amount",
      value: fmtAmt(totalAmount),
      accent: "#7e3af2",
    },
  ];

  return (
    <main
      style={{
        padding: "2rem",
        background: "#f9fafb",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a
            href="/finance"
            style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}
          >
            ← Finance & Accounting
          </a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              margin: "0 0 0.25rem",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Expense Vouchers
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            {rows.length} vouchers · Total paid{" "}
            {fmtAmt(totalPaid)}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
            marginBottom: "1.75rem",
          }}
        >
          {kpis.map((k) => (
            <div
              key={k.label}
              style={{
                background: "#fff",
                borderRadius: "8px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                padding: "1.25rem 1.5rem",
                borderTop: `3px solid ${k.accent}`,
              }}
            >
              <div
                style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.4rem", fontWeight: 500 }}
              >
                {k.label}
              </div>
              <div
                style={{ fontSize: "1.5rem", fontWeight: 700, color: k.accent }}
              >
                {k.value}
              </div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              textAlign: "center",
              color: "#9ca3af",
            }}
          >
            No expense vouchers found.
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.875rem",
                  minWidth: "960px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {[
                      "#",
                      "Project",
                      "Description",
                      "Amount",
                      "BOD Required",
                      "Status",
                      "Approved",
                      "Paid",
                      "Doc",
                    ].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "0.75rem 1rem",
                          textAlign: i === 3 ? "right" : "left",
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
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.DRAFT;
                    const isApprovedAndPaid = r.status === "APPROVED" && !!r.paidAt;
                    const isRejected = r.status === "REJECTED";
                    const rowBg = isApprovedAndPaid
                      ? "#f0fdf4"
                      : isRejected
                      ? "#fef2f2"
                      : undefined;

                    const desc60 =
                      (r.description ?? "").length > 60
                        ? (r.description ?? "").slice(0, 60) + "…"
                        : (r.description ?? "—");

                    const approvedStr = fmtDate(r.approvedAt);
                    const paidStr = fmtDate(r.paidAt);

                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                          background: rowBg,
                        }}
                      >
                        <td
                          style={{
                            padding: "0.65rem 1rem",
                            fontFamily: "monospace",
                            fontSize: "0.78rem",
                            color: "#6b7280",
                            whiteSpace: "nowrap",
                          }}
                        >
                          #{r.id.slice(0, 8)}
                        </td>
                        <td
                          style={{
                            padding: "0.65rem 1rem",
                            color: "#374151",
                            fontSize: "0.82rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.projectName ?? "—"}
                        </td>
                        <td
                          style={{
                            padding: "0.65rem 1rem",
                            color: "#374151",
                            maxWidth: "240px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={r.description ?? ""}
                        >
                          {desc60}
                        </td>
                        <td
                          style={{
                            padding: "0.65rem 1rem",
                            textAlign: "right",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmtAmt(r.amount)}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {r.requiresBodApproval ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.2rem 0.55rem",
                                borderRadius: "999px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                background: "#fef2f2",
                                color: "#b91c1c",
                              }}
                            >
                              Yes
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
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
                        <td
                          style={{
                            padding: "0.65rem 1rem",
                            color: "#6b7280",
                            fontSize: "0.82rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {approvedStr ?? "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                          {paidStr ? (
                            <span style={{ color: "#374151", fontSize: "0.82rem" }}>
                              {paidStr}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.2rem 0.55rem",
                                borderRadius: "999px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                background: "#fffbeb",
                                color: "#92400e",
                              }}
                            >
                              Unpaid
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "center" }}>
                          {r.supportingDocUrl ? (
                            <a
                              href={r.supportingDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: "none", fontSize: "1rem" }}
                            >
                              📎
                            </a>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
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
