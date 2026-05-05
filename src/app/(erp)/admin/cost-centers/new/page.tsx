export const dynamic = "force-dynamic";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase-server";
import { CostCenterForm } from "../CostCenterForm";

export default async function NewCostCenterPage() {
  await getAuthUser();
  const deptRows = await db.select({ id: departments.id, code: departments.code, name: departments.name }).from(departments).orderBy(departments.code);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "600px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/cost-centers" style={{ fontSize: "0.8rem", color: "#dc2626", textDecoration: "none" }}>← Cost Centers</a>
        </div>
        <h1 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>New Cost Center</h1>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <CostCenterForm mode="create" departments={deptRows.map((d) => ({ id: String(d.id), code: String(d.code), name: String(d.name) }))} />
        </div>
      </div>
    </main>
  );
}
