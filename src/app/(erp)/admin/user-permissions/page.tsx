export const dynamic = "force-dynamic";
import { db } from "@/db";
import { users, departments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import UserPermissionsClient from "./UserPermissionsClient";

const ACCENT = "#dc2626";

export default async function UserPermissionsPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:       users.id,
      fullName: users.fullName,
      email:    users.email,
      role:     users.role,
      deptCode: departments.code,
      isActive: users.isActive,
    })
    .from(users)
    .leftJoin(departments, eq(users.deptId, departments.id))
    .orderBy(users.fullName);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>User Permissions</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            Assign roles to control module access. {rows.length} user(s) registered.
          </p>
        </div>

        <UserPermissionsClient users={rows.map((r) => ({ ...r, deptCode: r.deptCode ?? null }))} />
      </div>
    </main>
  );
}
