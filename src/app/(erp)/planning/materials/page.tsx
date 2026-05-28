export const dynamic = "force-dynamic";

import { db } from "@/db";
import { materials, suppliers } from "@/db/schema";
import { eq, count } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

type MatRow = {
  id: string; code: string; name: string; unit: string; category: string | null;
  adminPrice: string; priceVersion: number; supplierName: string | null;
};

export default async function MaterialsMasterPage() {
  const [rows, categoryCounts] = await Promise.all([
    safe(
      db.select({
          id:           materials.id,
          code:         materials.code,
          name:         materials.name,
          unit:         materials.unit,
          category:     materials.category,
          adminPrice:   materials.adminPrice,
          priceVersion: materials.priceVersion,
          supplierName: suppliers.name,
        })
        .from(materials)
        .leftJoin(suppliers, eq(materials.preferredSupplierId, suppliers.id))
        .where(eq(materials.isActive, true))
        .orderBy(materials.category, materials.code),
      [] as MatRow[],
    ),
    safe(
      db.select({ category: materials.category, cnt: count() })
        .from(materials)
        .where(eq(materials.isActive, true))
        .groupBy(materials.category),
      [] as { category: string | null; cnt: number }[],
    ),
  ]);

  // Group by category
  const categoryMap = new Map<string, MatRow[]>();
  for (const row of rows) {
    const cat = row.category ?? "Uncategorized";
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(row);
  }

  const card: React.CSSProperties = { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };

  const totalMats = rows.length;
  const withSupplier = rows.filter((r) => r.supplierName).length;
  const concreteCount = rows.filter((r) => r.category === "CONCRETE").length;

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <style>{`
        details.mat-cat > summary { list-style: none; cursor: pointer; }
        details.mat-cat > summary::-webkit-details-marker { display: none; }
        details.mat-cat > summary .mat-chevron { transition: transform 0.2s; display: inline-block; }
        details.mat-cat[open] > summary .mat-chevron { transform: rotate(180deg); }
      `}</style>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>← Planning &amp; Engineering</a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Materials Catalog</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Read-only view of materials used in BOM entry. Admin prices are fixed and flow through to Purchase Requisitions automatically.
            Manage materials in <a href="/admin/master-list/materials" style={{ color: "#1a56db", textDecoration: "none" }}>Admin → Master List</a>.
          </p>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Active Materials",   value: totalMats,       accent: "#1a56db" },
            { label: "Categories",         value: categoryMap.size, accent: "#7e3af2" },
            { label: "With Supplier",      value: withSupplier,    accent: "#057a55" },
            { label: "Concrete Materials", value: concreteCount,   accent: "#0694a2" },
          ].map((k) => (
            <div key={k.label} style={{ ...card, padding: "1.1rem 1.4rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginTop: "0.3rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Info callout */}
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#1e40af", marginBottom: "1.25rem" }}>
          <strong>Admin Price</strong> is the fixed price set by Administration and locked into every Purchase Requisition. Materials with category <strong>CONCRETE</strong> generate Batching Forecast lines; all others go to the MRP Queue.
        </div>

        {rows.length === 0 ? (
          <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>No active materials found.</p>
            <a href="/admin/master-list/materials" style={{ color: "#1a56db", fontSize: "0.875rem" }}>Add materials in Admin →</a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Array.from(categoryMap.entries()).map(([cat, mats]) => (
              <details key={cat} className="mat-cat" open style={{ ...card, overflow: "hidden" }}>
                <summary>
                  <div style={{ padding: "0.75rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="mat-chevron" style={{ color: "#9ca3af", fontSize: "0.8rem" }}>▾</span>
                    <span style={{
                      fontFamily: "monospace", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700,
                      background: cat === "CONCRETE" ? "#ecfdf5" : cat === "Uncategorized" ? "#f3f4f6" : "#eff6ff",
                      color: cat === "CONCRETE" ? "#065f46" : cat === "Uncategorized" ? "#6b7280" : "#1e40af",
                    }}>{cat}</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{mats.length} material{mats.length !== 1 ? "s" : ""}</span>
                    {cat === "CONCRETE" && (
                      <span style={{ fontSize: "0.68rem", background: "#ecfdf5", color: "#065f46", padding: "0.15rem 0.5rem", borderRadius: "999px", fontWeight: 600 }}>→ Batching Forecast</span>
                    )}
                  </div>
                </summary>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                      <tr>
                        {["Code", "Material Name", "Unit", "Admin Price (PHP)", "Price Ver.", "Preferred Supplier"].map((h) => (
                          <th key={h} style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mats.map((mat, idx) => (
                        <tr key={mat.id} style={{ borderBottom: idx < mats.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                          <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#1e40af", fontWeight: 700 }}>{mat.code}</td>
                          <td style={{ padding: "0.6rem 1rem", color: "#111827", fontWeight: 600 }}>{mat.name}</td>
                          <td style={{ padding: "0.6rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{mat.unit}</td>
                          <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", fontWeight: 700, color: "#374151" }}>
                            ₱{Number(mat.adminPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "0.6rem 1rem", textAlign: "center" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#9ca3af" }}>v{mat.priceVersion}</span>
                          </td>
                          <td style={{ padding: "0.6rem 1rem", color: "#374151", fontSize: "0.82rem" }}>
                            {mat.supplierName ?? <span style={{ color: "#d1d5db" }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
