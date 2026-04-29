export const dynamic = "force-dynamic";
import { db } from "@/db";
import { inventoryStock, materials, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#e3a008";

export default async function InventoryPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:               inventoryStock.id,
      quantityOnHand:   inventoryStock.quantityOnHand,
      quantityReserved: inventoryStock.quantityReserved,
      lastUpdated:      inventoryStock.lastUpdated,
      projName:         projects.name,
      projId:           projects.id,
      matCode:          materials.code,
      matName:          materials.name,
      matUnit:          materials.unit,
      matCategory:      materials.category,
    })
    .from(inventoryStock)
    .leftJoin(materials, eq(inventoryStock.materialId, materials.id))
    .leftJoin(projects,  eq(inventoryStock.projectId,  projects.id))
    .orderBy(projects.name, materials.code);

  // Group by project
  type StockRow = typeof rows[number];
  const projectMap = new Map<string, { projId: string; projName: string; rows: StockRow[] }>();
  for (const r of rows) {
    const pid = r.projId ?? "unknown";
    if (!projectMap.has(pid)) projectMap.set(pid, { projId: pid, projName: r.projName ?? "Unknown", rows: [] });
    projectMap.get(pid)!.rows.push(r);
  }

  const totalSkus = rows.length;
  const lowStockCount = rows.filter((r) => Number(r.quantityOnHand) - Number(r.quantityReserved) <= 0).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Procurement & Stock</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Inventory</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {totalSkus} stock position{totalSkus !== 1 ? "s" : ""}
              {lowStockCount > 0 && <span style={{ color: "#b91c1c", fontWeight: 600 }}> · {lowStockCount} zero/negative available</span>}
            </p>
          </div>
          <a href="/procurement/receipts-and-transfers/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Receive Goods</a>
        </div>

        {projectMap.size === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No inventory yet. Inventory is updated when goods are received via MRR.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {Array.from(projectMap.values()).map((proj) => {
              const totalOnHand = proj.rows.reduce((s, r) => s + Number(r.quantityOnHand), 0);
              return (
                <div key={proj.projId} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                  <div style={{ padding: "0.85rem 1.25rem", background: "#fffbeb", borderBottom: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#92400e" }}>{proj.projName}</span>
                      <a href={`/master-list/projects/${proj.projId}`} style={{ fontSize: "0.75rem", color: ACCENT, textDecoration: "none" }}>View project →</a>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "#92400e" }}>{proj.rows.length} SKUs</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          {["Code", "Material", "Category", "Unit", "On Hand", "Reserved", "Available", "Last Updated"].map((h, i) => (
                            <th key={i} style={{ padding: "0.65rem 1rem", textAlign: i >= 4 && i <= 6 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {proj.rows.map((r) => {
                          const available = Number(r.quantityOnHand) - Number(r.quantityReserved);
                          const isLow = available <= 0;
                          return (
                            <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: isLow ? "#fef2f2" : "transparent" }}>
                              <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 600 }}>{r.matCode}</td>
                              <td style={{ padding: "0.6rem 1rem", color: "#111827" }}>{r.matName}</td>
                              <td style={{ padding: "0.6rem 1rem", color: "#6b7280", fontSize: "0.8rem" }}>{r.matCategory}</td>
                              <td style={{ padding: "0.6rem 1rem", color: "#6b7280" }}>{r.matUnit}</td>
                              <td style={{ padding: "0.6rem 1rem", textAlign: "right", fontWeight: 600 }}>{Number(r.quantityOnHand).toFixed(4)}</td>
                              <td style={{ padding: "0.6rem 1rem", textAlign: "right", color: "#9ca3af" }}>{Number(r.quantityReserved).toFixed(4)}</td>
                              <td style={{ padding: "0.6rem 1rem", textAlign: "right", fontWeight: 700, color: isLow ? "#b91c1c" : "#166534" }}>
                                {available.toFixed(4)}
                              </td>
                              <td style={{ padding: "0.6rem 1rem", color: "#9ca3af", fontSize: "0.8rem" }}>
                                {new Date(r.lastUpdated).toLocaleDateString("en-PH")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
