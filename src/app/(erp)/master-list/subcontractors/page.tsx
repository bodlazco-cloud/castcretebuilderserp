export const dynamic = "force-dynamic";
import { db } from "@/db";
import { subcontractors } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase-server";
import SubcontractorsTable from "./SubcontractorsTable";

export default async function SubcontractorsPage() {
  await getAuthUser();
  const rows = await db
    .select({
      id:                   subcontractors.id,
      code:                 subcontractors.code,
      name:                 subcontractors.name,
      tradeTypes:           subcontractors.tradeTypes,
      defaultMaxActiveUnits: subcontractors.defaultMaxActiveUnits,
      performanceGrade:     subcontractors.performanceGrade,
      performanceScore:     subcontractors.performanceScore,
      stopAssignment:       subcontractors.stopAssignment,
      isActive:             subcontractors.isActive,
    })
    .from(subcontractors)
    .orderBy(subcontractors.name);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Master List</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Subcontractors</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Accredited subcontractors, performance grades, and assignment status.</p>
          </div>
          <a href="/master-list/subcontractors/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#6366f1",
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Add Subcontractor</a>
        </div>

        <SubcontractorsTable rows={rows.map(r => ({ ...r, performanceScore: String(r.performanceScore) }))} />
      </div>
    </main>
  );
}
