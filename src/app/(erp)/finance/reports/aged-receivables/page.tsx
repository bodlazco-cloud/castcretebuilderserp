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

function daysOld(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / 86400000);
}

function ageBucket(days: number): "current" | "31-60" | "61-90" | "90+" {
  if (days <= 30) return "current";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function daysColor(days: number): string {
  if (days > 90) return "#dc2626";
  if (days > 60) return "#d97706";
  if (days > 30) return "#ca8a04";
  return "#111827";
}

export default async function Page() {
  const rows = await safe(
    () =>
      db
        .select({
          id: invoices.id,
          status: invoices.status,
          netAmountDue: invoices.netAmountDue,
          collectionAmount: invoices.collectionAmount,
          generatedAt: invoices.generatedAt,
          submittedAt: invoices.submittedAt,
          collectedAt: invoices.collectedAt,
          projectName: projects.name,
        })
        .from(invoices)
        .leftJoin(projects, eq(invoices.projectId, projects.id))
        .orderBy(desc(invoices.generatedAt))
        .limit(500),
    []
  );

  const outstanding = rows.filter((r) => r.status !== "COLLECTED");

  const withDays = outstanding
    .map((r) => ({
      ...r,
      days: daysOld(r.submittedAt),
    }))
    .sort((a, b) => b.days - a.days);

  type BucketKey = "current" | "31-60" | "61-90" | "90+";

  const buckets: Record<BucketKey, { count: number; total: number }> = {
    current: { count: 0, total: 0 },
    "31-60": { count: 0, total: 0 },
    "61-90": { count: 0, total: 0 },
    "90+": { count: 0, total: 0 },
  };

  for (const r of withDays) {
    const b = ageBucket(r.days);
    buckets[b].count += 1;
    buckets[b].total += Number(r.netAmountDue ?? 0);
  }

  const kpis: { label: string; accent: string; bucket: BucketKey }[] = [
    { label: "Current (0–30 days)", accent: "#057a55", bucket: "current" },
    { label: "31–60 Days", accent: "#d97706", bucket: "31-60" },
    { label: "61–90 Days", accent: "#ea580c", bucket: "61-90" },
    { label: "90+ Days (Critical)", accent: "#dc2626", bucket: "90+" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "32px 24px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <Link
          href="/finance"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#057a55", textDecoration: "none", fontSize: 14, fontWeight: 500, marginBottom: 20 }}
        >
          ← Finance & Accounting
        </Link>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
          Aged Receivables
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 28px" }}>
          Outstanding invoices grouped by age since submission — {withDays.length} invoice{withDays.length !== 1 ? "s" : ""} outstanding
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {kpis.map((k) => (
            <div
              key={k.label}
              style={{ background: "#fff", borderRadius: 10, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `4px solid ${k.accent}` }}
            >
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.accent, wordBreak: "break-all" }}>
                {buckets[k.bucket].count}
              </div>
              <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>
                {php(buckets[k.bucket].total)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          {withDays.length === 0 ? (
            <div style={{ padding: "64px 24px", textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#6b7280" }}>No outstanding receivables</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>All invoices have been collected.</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Invoice #", "Project", "Submitted", "Days Outstanding", "Net Due", "Status"].map((h) => (
                      <th
                        key={h}
                        style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {withDays.map((row) => {
                    const net = Number(row.netAmountDue ?? 0);
                    const color = daysColor(row.days);
                    let statusBg = "#f3f4f6";
                    let statusColor = "#6b7280";
                    if (row.status === "SUBMITTED") { statusBg = "#fef9c3"; statusColor = "#713f12"; }
                    else if (row.status === "PARTIALLY_COLLECTED") { statusBg = "#dbeafe"; statusColor = "#1e40af"; }

                    return (
                      <tr key={row.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#111827", whiteSpace: "nowrap" }}>
                          #{row.id.slice(0, 8)}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#374151", maxWidth: 200 }}>
                          {row.projectName ?? "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {fmtDate(row.submittedAt)}
                        </td>
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <span style={{ fontWeight: 700, color, fontSize: 13 }}>
                            {row.submittedAt ? `${row.days}d` : "—"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111827", whiteSpace: "nowrap" }}>
                          {net ? php(net) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, background: statusBg, color: statusColor, whiteSpace: "nowrap" }}>
                            {row.status ?? "DRAFT"}
                          </span>
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
