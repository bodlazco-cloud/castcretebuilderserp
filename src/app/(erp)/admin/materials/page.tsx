export const dynamic = "force-dynamic";
import { db } from "@/db";
import { materials, suppliers } from "@/db/schema";
import { eq, ilike, and, or } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import FilterBar from "@/components/FilterBar";

const ACCENT = "#dc2626";

type SearchParams = Promise<{ q?: string; category?: string; status?: string }>;

export default async function MaterialsPage({ searchParams }: { searchParams: SearchParams }) {
  await getAuthUser();

  const { q, category, status } = await searchParams;

  const conditions = and(
    q        ? or(ilike(materials.name, `%${q}%`), ilike(materials.code, `%${q}%`)) : undefined,
    category ? eq(materials.category, category)                                      : undefined,
    status === "active"   ? eq(materials.isActive, true)  : undefined,
    status === "inactive" ? eq(materials.isActive, false) : undefined,
  );

  const rows = await db
    .select({
      id:           materials.id,
      code:         materials.code,
      name:         materials.name,
      unit:         materials.unit,
      category:     materials.category,
      adminPrice:   materials.adminPrice,
      priceVersion: materials.priceVersion,
      isActive:     materials.isActive,
      supplierName: suppliers.name,
    })
    .from(materials)
    .leftJoin(suppliers, eq(materials.preferredSupplierId, suppliers.id))
    .where(conditions)
    .orderBy(materials.category, materials.code);

  // Category list for filter dropdown (unfiltered)
  const allCats = await db
    .selectDistinct({ category: materials.category })
    .from(materials)
    .orderBy(materials.category);

  const active = rows.filter((r) => r.isActive).length;
  const fmt = (v: string) =>
    `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  const filterValues: Record<string, string> = {
    ...(q        ? { q }        : {}),
    ...(category ? { category } : {}),
    ...(status   ? { status }   : {}),
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Materials & Pricing</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {active} active · {rows.length} shown
              {(q || category || status) ? " (filtered)" : ""}
            </p>
          </div>
          <a href="/admin/materials/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Add Material</a>
        </div>

        <FilterBar
          accent={ACCENT}
          values={filterValues}
          fields={[
            { type: "text",   name: "q",        placeholder: "Search name or code…" },
            { type: "select", name: "category",  placeholder: "All categories", options: allCats.map((c) => ({ value: c.category, label: c.category })) },
            { type: "select", name: "status",    placeholder: "All status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
          ]}
        />

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            {(q || category || status) ? "No materials match your filters." : <>No materials yet. <a href="/admin/materials/new" style={{ color: ACCENT }}>Add first material →</a></>}
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "780px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Code", "Name", "Category", "Unit", "Admin Price", "Version", "Pref. Supplier", "Status", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 4 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.isActive ? 1 : 0.5 }}>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>{r.code}</td>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151" }}>{r.name}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: "#f3f4f6", color: "#374151" }}>{r.category}</span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{r.unit}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(r.adminPrice)}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>v{r.priceVersion}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.supplierName ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: r.isActive ? "#f0fdf4" : "#f3f4f6", color: r.isActive ? "#057a55" : "#9ca3af" }}>
                          {r.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                        <a href={`/admin/materials/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>Edit →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
