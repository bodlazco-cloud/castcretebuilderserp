export const dynamic = "force-dynamic";
import { db } from "@/db";
import { users, departments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { UserActions } from "./UserActions";

const ACCENT = "#dc2626";

const ROLES = [
  "ADMIN", "MANAGER", "SUPERVISOR", "OFFICER", "STAFF",
  "ESTIMATOR", "ACCOUNTANT", "QA_ENGINEER", "SITE_ENGINEER", "FOREMAN",
];

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

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [user] = await db
    .select({
      id:        users.id,
      email:     users.email,
      fullName:  users.fullName,
      role:      users.role,
      isActive:  users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deptId:    users.deptId,
      deptCode:  departments.code,
      deptName:  departments.name,
    })
    .from(users)
    .leftJoin(departments, eq(users.deptId, departments.id))
    .where(eq(users.id, id));

  if (!user) notFound();

  const allDepts = await db.select({ id: departments.id, code: departments.code, name: departments.name }).from(departments);
  const deptSt   = DEPT_COLORS[user.deptCode ?? ""] ?? { bg: "#f3f4f6", color: "#6b7280" };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "720px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/users" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← User Management</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{user.fullName}</h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: user.isActive ? "#f0fdf4" : "#f3f4f6", color: user.isActive ? "#057a55" : "#9ca3af" }}>
                {user.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
              {user.deptCode && (
                <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: deptSt.bg, color: deptSt.color }}>
                  {user.deptCode}
                </span>
              )}
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#f3f4f6", color: "#374151" }}>
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.2rem" }}>Email</div>
              <div style={{ fontSize: "0.9rem", color: "#374151" }}>{user.email}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.2rem" }}>Department</div>
              <div style={{ fontSize: "0.9rem", color: "#374151" }}>{user.deptName ?? "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.2rem" }}>Created</div>
              <div style={{ fontSize: "0.9rem", color: "#374151" }}>{new Date(user.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.2rem" }}>Last Updated</div>
              <div style={{ fontSize: "0.9rem", color: "#374151" }}>{new Date(user.updatedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Edit User</h2>
          <UserActions
            id={user.id}
            fullName={user.fullName}
            role={user.role}
            deptId={user.deptId ?? null}
            isActive={user.isActive}
            departments={allDepts}
            roles={ROLES}
          />
        </div>
      </div>
    </main>
  );
}
