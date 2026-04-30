export const dynamic = "force-dynamic";
import { db } from "@/db";
import { users, departments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#dc2626";

const DEPT_COLORS: Record<string, { bg: string; color: string }> = {
  ADMIN:        { bg: "#fef2f2", color: "#b91c1c" },
  FINANCE:      { bg: "#fff7ed", color: "#c2410c" },
  CONSTRUCTION: { bg: "#f0fdf4", color: "#057a55" },
  PLANNING:     { bg: "#eff6ff", color: "#1a56db" },
  PROCUREMENT:  { bg: "#fefce8", color: "#854d0e" },
  AUDIT:        { bg: "#faf5ff", color: "#7e3af2" },
  HR:           { bg: "#fdf4ff", color: "#a21caf" },
  BATCHING:     { bg: "#f0fdfa", color: "#0f766e" },
  MOTORPOOL:    { bg: "#f8fafc", color: "#334155" },
  BOD:          { bg: "#f1f5f9", color: "#0f172a" },
};

export default async function UserManagementPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:        users.id,
      email:     users.email,
      fullName:  users.fullName,
      role:      users.role,
      isActive:  users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deptCode:  departments.code,
      deptName:  departments.name,
    })
    .from(users)
    .leftJoin(departments, eq(users.deptId, departments.id))
    .orderBy(users.fullName);

  const active   = rows.filter((r) => r.isActive).length;
  const inactive = rows.length - active;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>User Management</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {active} active · {inactive} inactive · {rows.length} total
            </p>
          </div>
          <a href="/admin/users/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Add User</a>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No users yet. <a href="/admin/users/new" style={{ color: ACCENT }}>Add first user →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "700px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Name", "Email", "Role", "Department", "Status", "Last Updated", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const deptSt = DEPT_COLORS[r.deptCode ?? ""] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.isActive ? 1 : 0.5 }}>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: 600, color: "#111827" }}>{r.fullName}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.email}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: "#f3f4f6", color: "#374151" }}>
                            {r.role}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {r.deptCode ? (
                            <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: deptSt.bg, color: deptSt.color }}>
                              {r.deptCode}
                            </span>
                          ) : <span style={{ color: "#9ca3af", fontSize: "0.82rem" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: r.isActive ? "#f0fdf4" : "#f3f4f6", color: r.isActive ? "#057a55" : "#9ca3af" }}>
                            {r.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>
                          {new Date(r.updatedAt).toLocaleDateString("en-PH")}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/admin/users/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>Edit →</a>
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
