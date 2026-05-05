export const dynamic = "force-dynamic";
import { db } from "@/db";
import { costCenters, departments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { CostCenterForm } from "../CostCenterForm";

export default async function EditCostCenterPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [row] = await db
    .select()
    .from(costCenters)
    .where(eq(costCenters.id, id));

  if (!row) notFound();

  const deptRows = await db.select({ id: departments.id, code: departments.code, name: departments.name }).from(departments).orderBy(departments.code);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "600px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/cost-centers" style={{ fontSize: "0.8rem", color: "#dc2626", textDecoration: "none" }}>← Cost Centers</a>
        </div>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{row.code} — {row.name}</h1>
        <div style={{ marginBottom: "1.5rem" }}>
          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 600, background: row.isActive ? "#f0fdf4" : "#f3f4f6", color: row.isActive ? "#057a55" : "#9ca3af" }}>
            {row.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <CostCenterForm
            mode="edit"
            departments={deptRows.map((d) => ({ id: String(d.id), code: String(d.code), name: String(d.name) }))}
            initial={{
              id: row.id,
              code: row.code,
              name: row.name,
              deptId: String(row.deptId),
              type: row.type,
              isActive: row.isActive,
            }}
          />
        </div>
      </div>
    </main>
  );
}
