export const dynamic = "force-dynamic";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase-server";

export default async function VendorsPage() {
  await getAuthUser();
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
          <a href="/master-list/vendors/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#6366f1",
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Add Vendor</a>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No vendors yet. Click &ldquo;+ Add Vendor&rdquo; to get started.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Vendor Name", "Status", "Added", ""].map((h, i) => (
                    <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 500, color: "#111827" }}>{r.name}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{
                        display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                        background: r.isActive ? "#dcfce7" : "#f3f4f6", color: r.isActive ? "#166534" : "#6b7280",
                      }}>{r.isActive ? "Active" : "Inactive"}</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#6b7280" }}>
                      {new Date(r.createdAt).toLocaleDateString("en-PH")}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <a href={`/master-list/vendors/${r.id}`} style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
