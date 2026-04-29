export const dynamic = "force-dynamic";
import { db } from "@/db";
import { changeOrderRequests, projects, activityDefinitions, materials } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#1a56db";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "#fef9c3", color: "#713f12" },
  APPROVED:  { bg: "#dcfce7", color: "#166534" },
  REJECTED:  { bg: "#fef2f2", color: "#b91c1c" },
  CANCELLED: { bg: "#f3f4f6", color: "#6b7280" },
};

const CHANGE_TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ADD:    { bg: "#f0fdf4", color: "#166534", label: "Add" },
  MODIFY: { bg: "#eff6ff", color: "#1e40af", label: "Modify" },
  REMOVE: { bg: "#fef2f2", color: "#b91c1c", label: "Remove" },
};

export default async function ChangeOrdersPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:            changeOrderRequests.id,
      changeType:    changeOrderRequests.changeType,
      unitModel:     changeOrderRequests.unitModel,
      unitType:      changeOrderRequests.unitType,
      oldQuantity:   changeOrderRequests.oldQuantity,
      newQuantity:   changeOrderRequests.newQuantity,
      status:        changeOrderRequests.status,
      reason:        changeOrderRequests.reason,
      createdAt:     changeOrderRequests.createdAt,
      projName:      projects.name,
      activityCode:  activityDefinitions.activityCode,
      activityName:  activityDefinitions.activityName,
      matCode:       materials.code,
      matName:       materials.name,
    })
    .from(changeOrderRequests)
    .leftJoin(projects,            eq(changeOrderRequests.projectId,    projects.id))
    .leftJoin(activityDefinitions, eq(changeOrderRequests.activityDefId, activityDefinitions.id))
    .leftJoin(materials,           eq(changeOrderRequests.materialId,    materials.id))
    .orderBy(desc(changeOrderRequests.createdAt));

  const pending  = rows.filter((r) => r.status === "PENDING").length;
  const approved = rows.filter((r) => r.status === "APPROVED").length;
  const rejected = rows.filter((r) => r.status === "REJECTED").length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Planning & Engineering</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Change Order Requests</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {rows.length} total — {pending} pending, {approved} approved, {rejected} rejected
            </p>
          </div>
          <a href="/planning/change-orders/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ New Change Order</a>
        </div>

        {/* Status pills */}
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {Object.entries(STATUS_STYLE).map(([s, st]) => {
              const c = rows.filter((r) => r.status === s).length;
              if (c === 0) return null;
              return (
                <span key={s} style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, background: st.bg, color: st.color }}>
                  {s}: {c}
                </span>
              );
            })}
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No change orders yet. <a href="/planning/change-orders/new" style={{ color: ACCENT }}>Submit first →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Activity", "Material", "Type", "Qty Change", "Status", "Date", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st  = STATUS_STYLE[r.status] ?? STATUS_STYLE.PENDING;
                    const ct  = CHANGE_TYPE_STYLE[r.changeType] ?? CHANGE_TYPE_STYLE.MODIFY;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {r.activityCode
                            ? <span style={{ fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 600, color: "#374151" }}>{r.activityCode}</span>
                            : <span style={{ color: "#9ca3af" }}>—</span>}
                          {r.activityName && <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{r.activityName}</div>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {r.matCode
                            ? <><span style={{ fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 600 }}>{r.matCode}</span><div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{r.matName}</div></>
                            : <span style={{ color: "#9ca3af" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: ct.bg, color: ct.color }}>
                            {ct.label}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontSize: "0.82rem", color: "#374151" }}>
                          {r.changeType === "REMOVE"
                            ? <span style={{ color: "#b91c1c" }}>Remove</span>
                            : r.oldQuantity != null || r.newQuantity != null
                              ? <span>{r.oldQuantity ?? "—"} → {r.newQuantity ?? "—"}</span>
                              : <span style={{ color: "#9ca3af" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>
                          {new Date(r.createdAt).toLocaleDateString("en-PH")}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/planning/change-orders/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
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
