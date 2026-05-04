export const dynamic = "force-dynamic";
import { db } from "@/db";
import { invoices, projects, developers, unitMilestones, milestoneDefinitions } from "@/db/schema";
import { eq, and, isNotNull, isNull } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#057a55";
const BUCKET_LABELS = ["0 – 30 Days", "31 – 60 Days", "61 – 90 Days", "90+ Days"];
const BUCKET_COLORS = ["#057a55", "#d97706", "#dc2626", "#7f1d1d"];

const fmtPhp = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ageBucket(days: number): 0 | 1 | 2 | 3 {
  if (days <= 30) return 0;
  if (days <= 60) return 1;
  if (days <= 90) return 2;
  return 3;
}

export default async function AgedReceivablesReportPage() {
  await getAuthUser();

  // "billed_uncollected" = submitted to developer but not yet collected
  const uncollected = await db
    .select({
      id:                  invoices.id,
      grossAccomplishment: invoices.grossAccomplishment,
      netAmountDue:        invoices.netAmountDue,
      submittedAt:         invoices.submittedAt,
      developerName:       developers.name,
      projectName:         projects.name,
      milestoneName:       milestoneDefinitions.name,
    })
    .from(invoices)
    .leftJoin(projects,             eq(invoices.projectId, projects.id))
    .leftJoin(developers,           eq(projects.developerId, developers.id))
    .leftJoin(unitMilestones,       eq(invoices.unitMilestoneId, unitMilestones.id))
    .leftJoin(milestoneDefinitions, eq(unitMilestones.milestoneDefId, milestoneDefinitions.id))
    .where(and(
      isNotNull(invoices.submittedAt),
      isNull(invoices.collectedAt),
    ))
    .orderBy(invoices.submittedAt);

  const now = new Date();

  const buckets = [0, 0, 0, 0] as [number, number, number, number];
  type Row = {
    id: string; developerName: string; projectName: string;
    milestoneName: string; billingDate: string; days: number;
    amount: number; bucket: 0 | 1 | 2 | 3;
  };
  const rows: Row[] = [];

  for (const inv of uncollected) {
    const amount      = Number(inv.netAmountDue ?? inv.grossAccomplishment);
    const billingDate = inv.submittedAt!;
    const days        = Math.floor((now.getTime() - billingDate.getTime()) / 86_400_000);
    const bucket      = ageBucket(days);
    buckets[bucket]  += amount;
    rows.push({
      id:            inv.id,
      developerName: inv.developerName ?? "Unknown Developer",
      projectName:   inv.projectName   ?? "—",
      milestoneName: inv.milestoneName ?? "—",
      billingDate:   billingDate.toISOString().split("T")[0],
      days,
      amount,
      bucket,
    });
  }

  rows.sort((a, b) => b.days - a.days);

  const totalReceivable = buckets.reduce((s, b) => s + b, 0);
  const runDate = now.toISOString().split("T")[0];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Finance & Accounting
          </a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
              Aged Receivables Report
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem", paddingLeft: "1.25rem" }}>
              Invoices submitted to developers but not yet collected, aged from billing date.
              Total receivable: <strong style={{ color: "#111827" }}>{fmtPhp(totalReceivable)}</strong>
            </p>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#9ca3af", fontFamily: "monospace", alignSelf: "flex-end" }}>
            Run Date: {runDate}
          </div>
        </div>

        {/* Bucket summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {BUCKET_LABELS.map((label, i) => {
            const pct = totalReceivable > 0 ? (buckets[i] / totalReceivable) * 100 : 0;
            return (
              <div key={label} style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "1.25rem", borderTop: `4px solid ${BUCKET_COLORS[i]}` }}>
                <div style={{ fontSize: "0.72rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: i >= 2 ? BUCKET_COLORS[i] : "#111827" }}>
                  {fmtPhp(buckets[i])}
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{ width: "100%", height: "4px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct.toFixed(1)}%`, background: BUCKET_COLORS[i], borderRadius: "999px" }} />
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.2rem" }}>
                    {pct.toFixed(1)}% of total
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail table */}
        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", textAlign: "center", color: "#9ca3af" }}>
            No outstanding receivables. All invoices have been collected.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "0.85rem 1.5rem", borderBottom: "1px solid #e5e7eb", fontWeight: 700, fontSize: "0.9rem", color: "#374151", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Uncollected Invoices ({rows.length})</span>
              <span style={{ fontWeight: 400, fontSize: "0.78rem", color: "#9ca3af" }}>Sorted oldest first</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", minWidth: "760px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Developer", "Project", "Milestone", "Billing Date", "Days Uncollected", "Bucket", "Amount"].map((h, i) => (
                      <th key={i} style={{ padding: "0.7rem 1rem", textAlign: i >= 4 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: r.bucket >= 2 ? "#fff9f9" : "transparent" }}>
                      <td style={{ padding: "0.7rem 1rem", fontWeight: 500, color: "#111827" }}>{r.developerName}</td>
                      <td style={{ padding: "0.7rem 1rem", color: "#6b7280" }}>{r.projectName}</td>
                      <td style={{ padding: "0.7rem 1rem", color: "#6b7280", fontSize: "0.8rem" }}>{r.milestoneName}</td>
                      <td style={{ padding: "0.7rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280" }}>{r.billingDate}</td>
                      <td style={{ padding: "0.7rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: r.bucket >= 2 ? BUCKET_COLORS[r.bucket] : "#374151" }}>
                        {r.days} days
                      </td>
                      <td style={{ padding: "0.7rem 1rem", textAlign: "right" }}>
                        <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: `${BUCKET_COLORS[r.bucket]}18`, color: BUCKET_COLORS[r.bucket] }}>
                          {BUCKET_LABELS[r.bucket]}
                        </span>
                      </td>
                      <td style={{ padding: "0.7rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: r.bucket >= 2 ? BUCKET_COLORS[r.bucket] : "#057a55" }}>
                        {fmtPhp(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                    <td colSpan={6} style={{ padding: "0.7rem 1rem", fontWeight: 700, color: "#374151", fontSize: "0.88rem" }}>Total Receivable</td>
                    <td style={{ padding: "0.7rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, fontSize: "0.95rem", color: "#057a55" }}>
                      {fmtPhp(totalReceivable)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
