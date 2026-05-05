export const dynamic = "force-dynamic";
import { db } from "@/db";
import { costCenters, departments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#dc2626";

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  PROJECT:  { bg: "#eff6ff", color: "#1a56db" },
  BATCHING: { bg: "#fef9c3", color: "#713f12" },
  FLEET:    { bg: "#f0fdf4", color: "#057a55" },
  HQ:       { bg: "#f3f4f6", color: "#374151" },
};

export default async function AdminCostCentersPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:       costCenters.id,
      code:     costCenters.code,
      name:     costCenters.name,
      type:     costCenters.type,
      isActive: costCenters.isActive,
      deptCode: departments.code,
      deptName: departments.name,
    })
    .from(costCenters)
    .leftJoin(departments, eq(costCenters.deptId, departments.id))
    .orderBy(costCenters.code);

  const active = rows.filter((r) => r.isActive).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1000px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Cost Centers</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>{active} active · {rows.length} total</p>
          </div>
          <a href="/admin/cost-centers/new" style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT, color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>+ New Cost Center</a>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No cost centers yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Code", "Name", "Type", "Department", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ts = TYPE_STYLE[r.type] ?? TYPE_STYLE.HQ;
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.isActive ? 1 : 0.55 }}>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: "#374151" }}>{r.code}</td>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#111827" }}>{r.name}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ display: "inline-block", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 600, background: ts.bg, color: ts.color }}>{r.type}</span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.deptCode ?? "—"} {r.deptName ? `— ${r.deptName}` : ""}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ display: "inline-block", padding: "0.15rem 0.45rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: r.isActive ? "#dcfce7" : "#f3f4f6", color: r.isActive ? "#166534" : "#6b7280" }}>
                          {r.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                        <a href={`/admin/cost-centers/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>Edit →</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
