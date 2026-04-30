export const dynamic = "force-dynamic";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { NewMaterialForm } from "./NewMaterialForm";

const CATEGORIES = ["Cement", "Steel", "Aggregates", "Formworks", "Electrical", "Plumbing", "Finishing", "Safety", "Equipment", "Other"];

export default async function NewMaterialPage() {
  await getAuthUser();
  const supplierList = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.isActive, true));

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "640px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/materials" style={{ fontSize: "0.8rem", color: "#dc2626", textDecoration: "none" }}>← Materials & Pricing</a>
        </div>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Add Material</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Register a new material in the master list with its admin price.</p>
        </div>
        <NewMaterialForm suppliers={supplierList} categories={CATEGORIES} />
      </div>
    </main>
  );
}
