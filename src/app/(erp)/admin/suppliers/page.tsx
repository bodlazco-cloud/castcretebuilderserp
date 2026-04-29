export const dynamic = "force-dynamic";
import { db } from "@/db";
import { suppliers, materials } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#dc2626";

export default async function SuppliersPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:        suppliers.id,
      name:      suppliers.name,
      isActive:  suppliers.isActive,
      createdAt: suppliers.createdAt,
    })
    .from(suppliers)
    .orderBy(suppliers.name);

  // Count materials per supplier
  const matCounts = await db
    .select({ supplierId: materials.preferredSupplierId, cnt: count() })
    .from(materials)
    .groupBy(materials.preferredSupplierId);
  const matMap = new Map(matCounts.map((r) => [r.supplierId, Number(r.cnt)]));

  const active = rows.filter((r) => r.isActive).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Suppliers</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>{active} active · {rows.length} total</p>
          </div>
          <a href="/admin/suppliers/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Add Supplier</a>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No suppliers yet. <a href="/admin/suppliers/new" style={{ color: ACCENT }}>Add first supplier →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Name", "Preferred For (Materials)", "Status", "Added"].map((h, i) => (
                    <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const matCount = matMap.get(r.id) ?? 0;
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.isActive ? 1 : 0.5 }}>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 600, color: "#111827" }}>{r.name}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>
                        {matCount > 0 ? `${matCount} material${matCount !== 1 ? "s" : ""}` : "—"}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: r.isActive ? "#f0fdf4" : "#f3f4f6", color: r.isActive ? "#057a55" : "#9ca3af" }}>
                          {r.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>
                        {new Date(r.createdAt).toLocaleDateString("en-PH")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
