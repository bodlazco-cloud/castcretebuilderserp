export const dynamic = "force-dynamic";
import { db } from "@/db";
import { payables, projects, subcontractors } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import FilterBar from "@/components/FilterBar";

const ACCENT = "#ff5a1f";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:              { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW:     { bg: "#fffbeb", color: "#b45309" },
  PENDING_AUDIT:      { bg: "#fef3c7", color: "#92400e" },
  READY_FOR_APPROVAL: { bg: "#eff6ff", color: "#1a56db" },
  APPROVED:           { bg: "#f0fdf4", color: "#057a55" },
  REJECTED:           { bg: "#fef2f2", color: "#e02424" },
  CANCELLED:          { bg: "#f3f4f6", color: "#9ca3af" },
};

type SearchParams = Promise<{ status?: string; projectId?: string }>;

export default async function PayablesPage({ searchParams }: { searchParams: SearchParams }) {
  await getAuthUser();

  const { status, projectId } = await searchParams;

  const conditions = and(
    status    ? sql`${payables.status} = ${status}` : undefined,
    projectId ? eq(payables.projectId, projectId) : undefined,
  );

  const [rows, allProjects] = await Promise.all([
    db
      .select({
        id:                    payables.id,
        status:                payables.status,
        grossAmount:           payables.grossAmount,
        lessAdvanceRecoupment: payables.lessAdvanceRecoupment,
        netPayable:            payables.netPayable,
        paidAt:                payables.paidAt,
        createdAt:             payables.createdAt,
        projName:              projects.name,
        projId:                projects.id,
        subName:               subcontractors.name,
      })
      .from(payables)
      .leftJoin(projects,       eq(payables.projectId, projects.id))
      .leftJoin(subcontractors, eq(payables.subconId,  subcontractors.id))
      .where(conditions)
      .orderBy(desc(payables.createdAt)),
    db.selectDistinct({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
  ]);

  const fmt = (v: string | null) =>
    v != null ? `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";

  const pending  = rows.filter((r) => ["DRAFT", "PENDING_REVIEW"].includes(r.status)).length;
  const approved = rows.filter((r) => r.status === "APPROVED").length;
  const paid     = rows.filter((r) => r.status === "APPROVED" && r.paidAt).length;
  const totalPending = rows
    .filter((r) => ["DRAFT", "PENDING_REVIEW", "PENDING_AUDIT", "READY_FOR_APPROVAL"].includes(r.status))
    .reduce((s, r) => s + Number(r.netPayable ?? r.grossAmount), 0);

  const filterValues: Record<string, string> = {
    ...(status    ? { status }    : {}),
    ...(projectId ? { projectId } : {}),
  };
  const isFiltered = !!(status || projectId);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Payables</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            {pending} pending · {approved} approved · {paid} paid
            {isFiltered ? " (filtered)" : ""}
          </p>
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Pending Review", value: pending,  color: "#b45309" },
            { label: "Approved",       value: approved, color: "#057a55" },
            { label: "Paid",           value: paid,     color: "#059669" },
            { label: "Total Pending",  value: `PHP ${totalPending.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, color: "#b45309" },
          ].map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${k.color}` }}>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "#111827" }}>{k.value}</div>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <FilterBar
          accent={ACCENT}
          values={filterValues}
          fields={[
            { type: "select", name: "status", placeholder: "All statuses", options: Object.keys(STATUS_STYLE).map((s) => ({ value: s, label: s.replace(/_/g, " ") })) },
            { type: "select", name: "projectId", placeholder: "All projects", options: allProjects.map((p) => ({ value: p.id, label: p.name })) },
          ]}
        />

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            {isFiltered ? "No payables match your filters." : "No payables recorded yet. Payables are generated from approved WARs."}
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "800px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Subcontractor", "Gross", "Advance Recoup", "Net Payable", "Status", "Paid", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i >= 2 && i <= 4 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.DRAFT;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151" }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.subName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace" }}>{fmt(r.grossAmount)}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>
                          {Number(r.lessAdvanceRecoupment) > 0 ? `(${fmt(r.lessAdvanceRecoupment)})` : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(r.netPayable)}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {r.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: r.paidAt ? "#057a55" : "#9ca3af", fontSize: "0.82rem" }}>
                          {r.paidAt ? new Date(r.paidAt).toLocaleDateString("en-PH") : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/finance/payables/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
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
