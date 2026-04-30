export const dynamic = "force-dynamic";
import { db } from "@/db";
import { invoices, projects, workAccomplishedReports, unitMilestones, milestoneDefinitions, projectUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { InvoiceActions } from "./InvoiceActions";

const ACCENT = "#ff5a1f";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: "#f3f4f6", color: "#6b7280" },
  SUBMITTED: { bg: "#eff6ff", color: "#1a56db" },
  COLLECTED: { bg: "#f0fdf4", color: "#057a55" },
  REJECTED:  { bg: "#fef2f2", color: "#e02424" },
};

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [inv] = await db
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
      unitModel:           projectUnits.unitModel,
      warId:               workAccomplishedReports.id,
      milestoneName:       milestoneDefinitions.name,
      milestoneWeight:     milestoneDefinitions.weightPct,
    })
    .from(invoices)
    .leftJoin(projects,               eq(invoices.projectId,             projects.id))
    .leftJoin(workAccomplishedReports, eq(invoices.warId,                workAccomplishedReports.id))
    .leftJoin(unitMilestones,          eq(invoices.unitMilestoneId,       unitMilestones.id))
    .leftJoin(milestoneDefinitions,    eq(unitMilestones.milestoneDefId,  milestoneDefinitions.id))
    .leftJoin(projectUnits,            eq(workAccomplishedReports.unitId, projectUnits.id))
    .where(eq(invoices.id, id));

  if (!inv) notFound();

  const st = STATUS_STYLE[inv.status] ?? STATUS_STYLE.DRAFT;
  const fmt = (v: string | null) =>
    v != null ? `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";

  const deductions = [
    { label: "DP Recovery",    value: inv.lessDpRecovery },
    { label: "OSM Deduction",  value: inv.lessOsmDeduction },
    { label: "Retention",      value: inv.lessRetention },
  ].filter((d) => Number(d.value ?? 0) > 0);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "800px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance/invoices" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Invoices</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Invoice</h1>
            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: st.bg, color: st.color }}>
              {inv.status}
            </span>
          </div>
        </div>

        {/* Billing summary */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Billing Summary</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#374151" }}>Gross Accomplishment</span>
              <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{fmt(inv.grossAccomplishment)}</span>
            </div>
            {deductions.map((d) => (
              <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#6b7280" }}>
                <span>Less: {d.label}</span>
                <span style={{ fontFamily: "monospace", color: "#dc2626" }}>({fmt(d.value)})</span>
              </div>
            ))}
            <div style={{ borderTop: "2px solid #111827", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>Net Amount Due</span>
              <span style={{ fontWeight: 700, fontSize: "1.1rem", fontFamily: "monospace", color: ACCENT }}>{fmt(inv.netAmountDue)}</span>
            </div>
            {inv.status === "COLLECTED" && inv.collectionAmount && (
              <div style={{ background: "#f0fdf4", borderRadius: "6px", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#057a55", fontWeight: 600 }}>Amount Collected</span>
                <span style={{ color: "#057a55", fontWeight: 700, fontFamily: "monospace" }}>{fmt(inv.collectionAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}>
              <div style={LABEL}>Project</div>
              {inv.projId
                ? <a href={`/master-list/projects/${inv.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{inv.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}><div style={LABEL}>Unit</div><div style={VALUE}>{inv.unitCode ? `${inv.unitCode} — ${inv.unitModel}` : "—"}</div></div>
            <div style={FIELD}><div style={LABEL}>Milestone</div><div style={VALUE}>{inv.milestoneName ?? "—"}{inv.milestoneWeight ? ` (${inv.milestoneWeight}%)` : ""}</div></div>
            <div style={FIELD}><div style={LABEL}>Generated</div><div style={VALUE}>{new Date(inv.generatedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div></div>
            {inv.submittedAt && (
              <div style={FIELD}><div style={LABEL}>Submitted</div><div style={VALUE}>{new Date(inv.submittedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div></div>
            )}
            {inv.collectedAt && (
              <div style={FIELD}><div style={LABEL}>Collected</div><div style={VALUE}>{new Date(inv.collectedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div></div>
            )}
            {inv.warId && (
              <div style={FIELD}>
                <div style={LABEL}>Source WAR</div>
                <a href={`/construction/war/${inv.warId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>View WAR →</a>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {inv.status !== "COLLECTED" && inv.status !== "REJECTED" && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Actions</h2>
            <InvoiceActions id={inv.id} status={inv.status} />
          </div>
        )}
      </div>
    </main>
  );
}
