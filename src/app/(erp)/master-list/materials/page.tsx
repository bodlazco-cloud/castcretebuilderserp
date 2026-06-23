export const dynamic = "force-dynamic";
import { db } from "@/db";
import { materials, suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, isAdminOrBod } from "@/lib/supabase-server";
import MaterialsTable from "./MaterialsTable";

export default async function MaterialsPage() {
  await getAuthUser();
  const isAdmin = await isAdminOrBod();

  const rows = await db
    .select({
      id:           materials.id,
      code:         materials.code,
      name:         materials.name,
      unit:         materials.unit,
      category:     materials.category,
      adminPrice:   materials.adminPrice,
      isActive:     materials.isActive,
      supName:      suppliers.name,
    })
    .from(materials)
    .leftJoin(suppliers, eq(materials.preferredSupplierId, suppliers.id))
    .orderBy(materials.code);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Master List</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Materials Master</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Materials catalog used across BOM and procurement.</p>
          </div>
          {isAdmin && (
            <a href="/master-list/materials/new" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#6366f1",
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>+ Add Material</a>
          )}
        </div>

        <MaterialsTable rows={rows} isAdmin={isAdmin} />
      </div>
    </main>
  );
}
