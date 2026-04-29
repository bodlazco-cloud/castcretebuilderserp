export const dynamic = "force-dynamic";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase-server";
import { NewUserForm } from "./NewUserForm";

const ROLES = [
  "ADMIN", "MANAGER", "SUPERVISOR", "OFFICER", "STAFF",
  "ESTIMATOR", "ACCOUNTANT", "QA_ENGINEER", "SITE_ENGINEER", "FOREMAN",
];

export default async function NewUserPage() {
  await getAuthUser();
  const depts = await db.select({ id: departments.id, code: departments.code, name: departments.name }).from(departments);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "640px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/users" style={{ fontSize: "0.8rem", color: "#dc2626", textDecoration: "none" }}>← User Management</a>
        </div>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Add User</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Create a new ERP system user and assign their department and role.</p>
        </div>
        <NewUserForm departments={depts} roles={ROLES} />
      </div>
    </main>
  );
}
