export const dynamic = "force-dynamic";

import { db } from "@/db";
import { inventoryStock, materials, projects } from "@/db/schema";
import { eq } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

type StockRow = {
  id: string;
  quantityOnHand: string;
  quantityReserved: string;
  lastUpdated: Date;
  materialCode: string | null;
  materialName: string | null;
  materialUnit: string | null;
  materialCategory: string | null;
  minimumQuantity: string | null;
  adminPrice: string;
  projectName: string | null;
};

type ComputedRow = StockRow & {
  quantityAvailable: number;
  isLowStock: boolean;
};

function fmt(n: number): string {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(n: number): string {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export default async function StockLevelAnalysisPage() {
  const rawRows = await safe(
    db.select({
      id: inventoryStock.id,
      quantityOnHand: inventoryStock.quantityOnHand,
      quantityReserved: inventoryStock.quantityReserved,
      lastUpdated: inventoryStock.lastUpdated,
      materialCode: materials.code,
      materialName: materials.name,
      materialUnit: materials.unit,
      materialCategory: materials.category,
      minimumQuantity: materials.minimumQuantity,
      adminPrice: materials.adminPrice,
      projectName: projects.name,
    })
    .from(inventoryStock)
    .leftJoin(materials, eq(inventoryStock.materialId, materials.id))
    .leftJoin(projects, eq(inventoryStock.projectId, projects.id))
    .orderBy(projects.name, materials.category, materials.name),
    [] as StockRow[]
  );

  const rows: ComputedRow[] = rawRows.map((r) => {
    const qoh = Number(r.quantityOnHand);
    const qres = Number(r.quantityReserved);
    const quantityAvailable = qoh - qres;
    const minQty = r.minimumQuantity ? Number(r.minimumQuantity) : 0;
    const isLowStock = minQty > 0 && quantityAvailable < minQty;
    return { ...r, quantityAvailable, isLowStock };
  });

  const totalInventoryValue = rows.reduce((sum, r) => {
    const price = Number(r.adminPrice);
    return sum + r.quantityAvailable * price;
  }, 0);

  const lowStockCount = rows.filter((r) => r.isLowStock).length;

  const uniqueProjects = new Set(rows.map((r) => r.projectName ?? "—")).size;

  const grouped = new Map<string, ComputedRow[]>();
  for (const row of rows) {
    const key = row.projectName ?? "—";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        details > summary { list-style: none; cursor: pointer; }
        details > summary::-webkit-details-marker { display: none; }
        details > summary .chevron { display: inline-block; transition: transform 0.2s; margin-right: 0.5rem; }
        details[open] > summary .chevron { transform: rotate(90deg); }
      `}</style>

      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement" style={{ fontSize: "0.8rem", color: "#e3a008", textDecoration: "none" }}>← Procurement &amp; Stock</a>
        </div>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Stock Level Analysis</h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem" }}>Current stock on hand versus minimum reorder levels across all sites.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem", borderTop: "4px solid #e3a008" }}>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Total Stock Lines</div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#e3a008" }}>{rows.length}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem", borderTop: "4px solid #dc2626" }}>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Low Stock</div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#dc2626" }}>{lowStockCount}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem", borderTop: "4px solid #057a55" }}>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Total Inventory Value</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#057a55" }}>₱{fmt(totalInventoryValue)}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem", borderTop: "4px solid #1a56db" }}>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Projects Tracked</div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1a56db" }}>{uniqueProjects}</div>
          </div>
        </div>

        {lowStockCount > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.875rem 1.25rem", marginBottom: "1.5rem", color: "#b91c1c", fontWeight: 600, fontSize: "0.9rem" }}>
            ⚠ {lowStockCount} material(s) below minimum stock level.
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "1rem" }}>
            No stock records found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Array.from(grouped.entries()).map(([projectName, projectRows]) => {
              const projectLowStock = projectRows.filter((r) => r.isLowStock).length;
              const categoryGroups = new Map<string, ComputedRow[]>();
              for (const row of projectRows) {
                const cat = row.materialCategory ?? "Uncategorized";
                if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
                categoryGroups.get(cat)!.push(row);
              }
              return (
                <details key={projectName} open style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                  <summary style={{ padding: "1rem 1.25rem", fontWeight: 700, fontSize: "1rem", color: "#111827", display: "flex", alignItems: "center", gap: "0.5rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <span className="chevron" style={{ color: "#6b7280", fontSize: "0.75rem" }}>▶</span>
                    <span>{projectName}</span>
                    <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", fontWeight: 400, color: "#6b7280" }}>· {projectRows.length} line{projectRows.length !== 1 ? "s" : ""}</span>
                    {projectLowStock > 0 && (
                      <span style={{ marginLeft: "0.25rem", fontSize: "0.8rem", fontWeight: 600, color: "#dc2626" }}>· {projectLowStock} low stock alert{projectLowStock !== 1 ? "s" : ""}</span>
                    )}
                  </summary>
                  <div style={{ overflowX: "auto" }}>
                    {Array.from(categoryGroups.entries()).map(([category, catRows]) => (
                      <div key={category}>
                        <div style={{ padding: "0.5rem 1.25rem", background: "#f3f4f6", fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>
                          {category}
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
                          <thead>
                            <tr style={{ background: "#f9fafb" }}>
                              <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>Code</th>
                              <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>Material</th>
                              <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>Category</th>
                              <th style={{ padding: "0.6rem 1rem", textAlign: "right", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>On Hand</th>
                              <th style={{ padding: "0.6rem 1rem", textAlign: "right", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>Reserved</th>
                              <th style={{ padding: "0.6rem 1rem", textAlign: "right", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>Available</th>
                              <th style={{ padding: "0.6rem 1rem", textAlign: "right", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>Min Level</th>
                              <th style={{ padding: "0.6rem 1rem", textAlign: "right", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>Stock Value</th>
                              <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>Last Updated</th>
                              <th style={{ padding: "0.6rem 1rem", textAlign: "center", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catRows.map((row, i) => {
                              const minQty = row.minimumQuantity ? Number(row.minimumQuantity) : 0;
                              const unit = row.materialUnit ?? "";
                              const isAmber = !row.isLowStock && minQty > 0 && row.quantityAvailable < minQty * 2;
                              const availColor = row.isLowStock ? "#dc2626" : isAmber ? "#d97706" : "#057a55";
                              const stockValue = row.quantityAvailable * Number(row.adminPrice);
                              const rowBg = row.isLowStock ? "#fef2f2" : i % 2 === 0 ? "#fff" : "#fafafa";
                              return (
                                <tr key={row.id} style={{ background: rowBg }}>
                                  <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #f3f4f6", fontFamily: "monospace", color: "#374151", whiteSpace: "nowrap" }}>{row.materialCode ?? "—"}</td>
                                  <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #f3f4f6", color: "#111827" }}>{row.materialName ?? "—"}</td>
                                  <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #f3f4f6", color: "#6b7280" }}>{row.materialCategory ?? "—"}</td>
                                  <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #f3f4f6", textAlign: "right", color: "#374151", whiteSpace: "nowrap" }}>{fmtQty(Number(row.quantityOnHand))} {unit}</td>
                                  <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #f3f4f6", textAlign: "right", color: "#374151", whiteSpace: "nowrap" }}>{fmtQty(Number(row.quantityReserved))} {unit}</td>
                                  <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #f3f4f6", textAlign: "right", fontWeight: 700, color: availColor, whiteSpace: "nowrap" }}>{fmtQty(row.quantityAvailable)} {unit}</td>
                                  <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #f3f4f6", textAlign: "right", color: "#6b7280", whiteSpace: "nowrap" }}>{minQty > 0 ? `${fmtQty(minQty)} ${unit}` : "—"}</td>
                                  <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #f3f4f6", textAlign: "right", color: "#374151", whiteSpace: "nowrap" }}>
                                    {Number(row.adminPrice) > 0 ? `₱${stockValue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—"}
                                  </td>
                                  <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #f3f4f6", color: "#6b7280", whiteSpace: "nowrap" }}>{fmtDate(row.lastUpdated)}</td>
                                  <td style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #f3f4f6", textAlign: "center", whiteSpace: "nowrap" }}>
                                    {row.isLowStock ? (
                                      <span style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "0.75rem", fontWeight: 600 }}>⚠ Low</span>
                                    ) : (
                                      <span style={{ background: "#f0fdf4", color: "#057a55", border: "1px solid #86efac", borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "0.75rem", fontWeight: 600 }}>OK</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
