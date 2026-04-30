export const dynamic = "force-dynamic";
import { db } from "@/db";
import { invoices, projects, workAccomplishedReports, unitMilestones, milestoneDefinitions, projectUnits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#ff5a1f";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: "#f3f4f6", color: "#6b7280" },
  SUBMITTED: { bg: "#eff6ff", color: "#1a56db" },
  COLLECTED: { bg: "#f0fdf4", color: "#057a55" },
  REJECTED:  { bg: "#fef2f2", color: "#e02424" },
};

export default async function InvoicesPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:                  invoices.id,
      status:              invoices.status,
      grossAccomplishment: invoices.grossAccomplishment,
      lessDpRecovery:      invoices.lessDpRecovery,
      lessOsmDeduction:    invoices.lessOsmDeduction,
      lessRetention:       invoices.lessRetention,
      netAmountDue:        invoices.netAmountDue,
      generatedAt:         invoices.generatedAt,
      submittedAt:         invoices.submittedAt,
      collectedAt:         invoices.collectedAt,
      collectionAmount:    invoices.collectionAmount,
      projName:            projects.name,
      projId:              projects.id,
      unitCode:            projectUnits.unitCode,
      milestoneName:       milestoneDefinitions.name,
    })
    .from(invoices)
    .leftJoin(projects,               eq(invoices.projectId,             projects.id))
    .leftJoin(workAccomplishedReports, eq(invoices.warId,                workAccomplishedReports.id))
    .leftJoin(unitMilestones,          eq(invoices.unitMilestoneId,       unitMilestones.id))
    .leftJoin(milestoneDefinitions,    eq(unitMilestones.milestoneDefId,  milestoneDefinitions.id))
    .leftJoin(projectUnits,            eq(workAccomplishedReports.unitId, projectUnits.id))
    .orderBy(desc(invoices.generatedAt));

  const totalDraft     = rows.filter((r) => r.status === "DRAFT").length;
  const totalSubmitted = rows.filter((r) => r.status === "SUBMITTED").length;
  const totalCollected = rows.filter((r) => r.status === "COLLECTED").length;

  const totalCollectedValue = rows
    .filter((r) => r.status === "COLLECTED" && r.collectionAmount)
    .reduce((s, r) => s + Number(r.collectionAmount), 0);

  const fmt = (v: string | null) =>
    v != null ? `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Invoices</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {totalDraft} draft · {totalSubmitted} submitted · {totalCollected} collected
            </p>
          </div>
          <a href="/finance/invoices/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Generate Invoice</a>
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
          {[
            { label: "Draft", value: totalDraft, color: "#6b7280" },
            { label: "Submitted", value: totalSubmitted, color: "#1a56db" },
            { label: "Collected", value: totalCollected, color: "#057a55" },
            { label: "Total Collected", value: `PHP ${totalCollectedValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, color: "#057a55" },
          ].map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${k.color}` }}>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#111827" }}>{k.value}</div>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No invoices yet. <a href="/finance/invoices/new" style={{ color: ACCENT }}>Generate first invoice →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Unit", "Milestone", "Gross", "Deductions", "Net Due", "Status", "Generated", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i >= 3 && i <= 5 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.DRAFT;
                    const deductions = Number(r.lessDpRecovery ?? 0) + Number(r.lessOsmDeduction ?? 0) + Number(r.lessRetention ?? 0);
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151" }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.8rem" }}>{r.unitCode ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.milestoneName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace" }}>{fmt(r.grossAccomplishment)}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#dc2626" }}>
                          {deductions > 0 ? `(${deductions.toLocaleString("en-PH", { minimumFractionDigits: 2 })})` : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(r.netAmountDue)}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>
                          {new Date(r.generatedAt).toLocaleDateString("en-PH")}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/finance/invoices/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
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
