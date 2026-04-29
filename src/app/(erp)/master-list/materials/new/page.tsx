export const dynamic = "force-dynamic";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { NewMaterialForm } from "../NewMaterialForm";

export default async function NewMaterialPage() {
  await getAuthUser();
  const supplierOptions = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.isActive, true))
    .orderBy(suppliers.name);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "680px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/materials" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Materials Master</a>
        </div>
        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, borderLeft: "4px solid #6366f1", paddingLeft: "0.75rem" }}>
            Add Material
          </h1>
          <p style={{ margin: "0 0 0 1.25rem", color: "#6b7280", fontSize: "0.9rem" }}>
            Add a material to the master catalog for use in BOMs and procurement.
          </p>
        </header>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <NewMaterialForm suppliers={supplierOptions} />
        </div>
      </div>
    </main>
  );
}
