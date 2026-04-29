export const dynamic = "force-dynamic";
import { db } from "@/db";
import { punchLists, projects, projectUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { PunchActions } from "./PunchActions";

const ACCENT = "#7e3af2";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  OPEN:        { bg: "#fef2f2", color: "#b91c1c" },
  IN_PROGRESS: { bg: "#fef9c3", color: "#713f12" },
  CLOSED:      { bg: "#dcfce7", color: "#166534" },
};

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function PunchListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [item] = await db
    .select({
      id:        punchLists.id,
      item:      punchLists.item,
      category:  punchLists.category,
      status:    punchLists.status,
      dueDate:   punchLists.dueDate,
      closedAt:  punchLists.closedAt,
      createdAt: punchLists.createdAt,
      projId:    projects.id,
      projName:  projects.name,
      unitCode:  projectUnits.unitCode,
      unitModel: projectUnits.unitModel,
    })
    .from(punchLists)
    .leftJoin(projects,     eq(punchLists.projectId, projects.id))
    .leftJoin(projectUnits, eq(punchLists.unitId,    projectUnits.id))
    .where(eq(punchLists.id, id));

  if (!item) notFound();

  const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.OPEN;
  const isOverdue = item.dueDate && item.status !== "CLOSED" && new Date(item.dueDate) < new Date();

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit/qa-punch-list" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← QA Punch List</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Punch List Item</h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: st.bg, color: st.color }}>
                {item.status.replace(/_/g, " ")}
              </span>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#f3f4f6", color: "#374151" }}>
                {item.category}
              </span>
              {isOverdue && (
                <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#fef2f2", color: "#b91c1c" }}>
                  OVERDUE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Issue description */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Issue Description</h2>
          <p style={{ margin: 0, color: "#374151", fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.item}</p>
        </div>

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}>
              <div style={LABEL}>Project</div>
              {item.projId
                ? <a href={`/master-list/projects/${item.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{item.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}><div style={LABEL}>Unit</div><div style={VALUE}>{item.unitCode ? `${item.unitCode} — ${item.unitModel}` : "—"}</div></div>
            <div style={FIELD}><div style={LABEL}>Created</div><div style={VALUE}>{new Date(item.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div></div>
            {item.dueDate && (
              <div style={FIELD}>
                <div style={LABEL}>Due Date</div>
                <div style={{ ...VALUE, color: isOverdue ? "#b91c1c" : "#111827" }}>{item.dueDate}</div>
              </div>
            )}
            {item.closedAt && (
              <div style={FIELD}>
                <div style={LABEL}>Closed</div>
                <div style={VALUE}>{new Date(item.closedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {item.status !== "CLOSED" && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Actions</h2>
            <PunchActions id={item.id} status={item.status} />
          </div>
        )}
      </div>
    </main>
  );
}
