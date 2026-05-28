import { db } from "@/db";
import { invoices, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 6000)
      ),
    ]);
    return result;
  } catch {
    return fallback;
  }
}

const php = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: string | null) {
  let bg = "#f3f4f6";
  let color = "#6b7280";
  if (status === "SUBMITTED") { bg = "#fef9c3"; color = "#713f12"; }
  else if (status === "COLLECTED") { bg = "#dcfce7"; color = "#166534"; }
  else if (status === "PARTIALLY_COLLECTED") { bg = "#dbeafe"; color = "#1e40af"; }
  return { bg, color };
}

export default async function Page() {
  const rows = await safe(
    () =>
      db
        .select({
          id: invoices.id,
          status: invoices.status,
          grossAccomplishment: invoices.grossAccomplishment,
          lessDpRecovery: invoices.lessDpRecovery,
          lessOsmDeduction: invoices.lessOsmDeduction,
          lessRetention: invoices.lessRetention,
          netAmountDue: invoices.netAmountDue,
          generatedAt: invoices.generatedAt,
          submittedAt: invoices.submittedAt,
          collectedAt: invoices.collectedAt,
          collectionAmount: invoices.collectionAmount,
          projectName: projects.name,
        })
        .from(invoices)
        .leftJoin(projects, eq(invoices.projectId, projects.id))
        .orderBy(desc(invoices.generatedAt))
        .limit(200),
    []
  );

  const totalGross = rows.reduce((s, r) => s + Number(r.grossAccomplishment), 0);
  const totalNetDue = rows.reduce((s, r) => s + Number(r.netAmountDue ?? 0), 0);
  const totalCollected = rows.reduce((s, r) => s + Number(r.collectionAmount ?? 0), 0);
  const outstandingBalance = totalNetDue - totalCollected;

  const kpis = [
    { label: "Total Invoices", value: String(rows.length), accent: "#057a55" },
    { label: "Total Gross", value: php(totalGross), accent: "#7e3af2" },
    { label: "Total Collected", value: php(totalCollected), accent: "#1a56db" },
    {
      label: "Outstanding",
      value: php(outstandingBalance),
      accent: outstandingBalance > 0 ? "#dc2626" : "#057a55",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Link
          href="/finance"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#057a55",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 20,
          }}
        >
          ← Finance & Accounting
        </Link>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 8px",
          }}
        >
          Billing & Invoices
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 28px" }}>
          Invoice and billing records for all projects
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {kpis.map((k) => (
            <div
              key={k.label}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: "20px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                borderTop: `4px solid ${k.accent}`,
              }}
            >
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                {k.label}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: k.accent,
                  wordBreak: "break-all",
                }}
              >
                {k.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {rows.length === 0 ? (
            <div
              style={{
                padding: "64px 24px",
                textAlign: "center",
                color: "#9ca3af",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#6b7280" }}>
                No invoices found
              </div>
              <div style={{ fontSize: 14, marginTop: 4 }}>
                Invoice records will appear here once created.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {[
                      "Invoice #",
                      "Project",
                      "Gross Amount",
                      "DP Recovery",
                      "OSM Deduction",
                      "Retention",
                      "Net Due",
                      "Status",
                      "Collected",
                      "Generated",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          textAlign: "left",
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
                  {rows.map((row) => {
                    const isCollected = row.status === "COLLECTED";
                    const badge = statusBadge(row.status);
                    const gross = Number(row.grossAccomplishment);
                    const dp = Number(row.lessDpRecovery ?? 0);
                    const osm = Number(row.lessOsmDeduction ?? 0);
                    const ret = Number(row.lessRetention ?? 0);
                    const net = Number(row.netAmountDue ?? 0);
                    const collected = Number(row.collectionAmount ?? 0);

                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: isCollected ? "#f0fdf4" : "#fff",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            fontFamily: "monospace",
                            color: "#111827",
                            whiteSpace: "nowrap",
                          }}
                        >
                          #{row.id.slice(0, 8)}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#374151",
                            maxWidth: 180,
                          }}
                        >
                          {row.projectName ?? "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#111827",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {gross ? php(gross) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {dp ? php(dp) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {osm ? php(osm) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ret ? php(ret) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#111827",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {net ? php(net) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 10px",
                              borderRadius: 9999,
                              fontSize: 11,
                              fontWeight: 600,
                              background: badge.bg,
                              color: badge.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.status ?? "DRAFT"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <div style={{ color: "#111827" }}>
                            {collected ? php(collected) : "—"}
                          </div>
                          {row.collectedAt && (
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                              {fmtDate(row.collectedAt)}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: "#6b7280",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmtDate(row.generatedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
