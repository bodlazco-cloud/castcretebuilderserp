export const dynamic = "force-dynamic";
import { db } from "@/db";
import { purchaseRequisitions, purchaseRequisitionItems, projects, activityDefinitions } from "@/db/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import FilterBar from "@/components/FilterBar";

const ACCENT = "#e3a008";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:               { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW:      { bg: "#fef9c3", color: "#713f12" },
  PENDING_AUDIT:       { bg: "#eff6ff", color: "#1e40af" },
  READY_FOR_APPROVAL:  { bg: "#e0e7ff", color: "#3730a3" },
  APPROVED:            { bg: "#dcfce7", color: "#166534" },
  REJECTED:            { bg: "#fef2f2", color: "#b91c1c" },
  CANCELLED:           { bg: "#f3f4f6", color: "#6b7280" },
};

type SearchParams = Promise<{ status?: string; projectId?: string }>;

export default async function PurchaseRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  await getAuthUser();

  const { status, projectId } = await searchParams;

  const conditions = and(
    status    ? sql`${purchaseRequisitions.status} = ${status}` : undefined,
    projectId ? eq(purchaseRequisitions.projectId, projectId) : undefined,
  );

  const [rows, totals, allProjects] = await Promise.all([
    db
      .select({
        id:           purchaseRequisitions.id,
        status:       purchaseRequisitions.status,
        createdAt:    purchaseRequisitions.createdAt,
        approvedAt:   purchaseRequisitions.approvedAt,
        projName:     projects.name,
        projId:       projects.id,
        activityCode: activityDefinitions.activityCode,
        activityName: activityDefinitions.activityName,
      })
      .from(purchaseRequisitions)
      .leftJoin(projects,            eq(purchaseRequisitions.projectId,     projects.id))
      .leftJoin(activityDefinitions, eq(purchaseRequisitions.activityDefId, activityDefinitions.id))
      .where(conditions)
      .orderBy(desc(purchaseRequisitions.createdAt)),
    db
      .select({ prId: purchaseRequisitionItems.prId, lines: count() })
      .from(purchaseRequisitionItems)
      .groupBy(purchaseRequisitionItems.prId),
    db.selectDistinct({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
  ]);

  const totalMap = Object.fromEntries(totals.map((t) => [t.prId, Number(t.lines)]));
  const pending  = rows.filter((r) => r.status === "PENDING_REVIEW").length;
  const approved = rows.filter((r) => r.status === "APPROVED").length;

  const filterValues: Record<string, string> = {
    ...(status    ? { status }    : {}),
    ...(projectId ? { projectId } : {}),
  };
  const isFiltered = !!(status || projectId);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Procurement & Stock</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Purchase Requests</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {rows.length} total — {pending} pending review, {approved} approved
              {isFiltered ? " (filtered)" : ""}
            </p>
          </div>
        </div>

        <FilterBar
          accent={ACCENT}
          values={filterValues}
          fields={[
            { type: "select", name: "status",    placeholder: "All statuses", options: Object.keys(STATUS_STYLE).map((s) => ({ value: s, label: s.replace(/_/g, " ") })) },
            { type: "select", name: "projectId", placeholder: "All projects", options: allProjects.map((p) => ({ value: p.id, label: p.name })) },
          ]}
        />

        {/* Status summary pills */}
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {Object.entries(STATUS_STYLE).map(([s, st]) => {
              const c = rows.filter((r) => r.status === s).length;
              if (c === 0) return null;
              return (
                <span key={s} style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, background: st.bg, color: st.color }}>
                  {s.replace(/_/g, " ")}: {c}
                </span>
              );
            })}
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            {isFiltered ? "No PRs match your filters." : "No purchase requests yet. PRs are auto-generated from the BOM when planning triggers a budget request."}
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "780px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Activity", "Lines", "Status", "Created", "Approved", ""].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.DRAFT;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500 }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {r.activityCode
                            ? <><span style={{ fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 600 }}>{r.activityCode}</span><div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{r.activityName}</div></>
                            : <span style={{ color: "#9ca3af" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{totalMap[r.id] ?? 0}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {r.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{new Date(r.createdAt).toLocaleDateString("en-PH")}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>
                          {r.approvedAt ? new Date(r.approvedAt).toLocaleDateString("en-PH") : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/procurement/pr/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
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
