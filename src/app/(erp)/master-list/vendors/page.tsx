export const dynamic = "force-dynamic";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { getAuthUser, isAdminOrBod } from "@/lib/supabase-server";
import VendorsTable from "./VendorsTable";

export default async function VendorsPage() {
  await getAuthUser();
  const isAdmin = await isAdminOrBod();
  const rows = await db
    .select({ id: suppliers.id, name: suppliers.name, isActive: suppliers.isActive, createdAt: suppliers.createdAt })
    .from(suppliers)
    .orderBy(suppliers.name);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Master List</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Vendors / Suppliers</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Approved vendor accreditation and preferred material links.</p>
          </div>
          {isAdmin && (
            <a href="/master-list/vendors/new" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#6366f1",
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>+ Add Vendor</a>
          )}
        </div>

        <VendorsTable rows={rows} isAdmin={isAdmin} />
      </div>
    </main>
  );
}
