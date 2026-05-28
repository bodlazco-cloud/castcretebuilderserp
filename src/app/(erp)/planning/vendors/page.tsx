export const dynamic = "force-dynamic";

import { db } from "@/db";
import { suppliers, materials } from "@/db/schema";
import { eq, count } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

type VendorRow = {
  id: string; name: string; phone: string | null; email: string | null;
  contactPerson: string | null; isActive: boolean; materialCount: number;
};

export default async function VendorsPage() {
  const [supplierRows, matCounts] = await Promise.all([
    safe(
      db.select({
          id:            suppliers.id,
          name:          suppliers.name,
          phone:         suppliers.phone,
          email:         suppliers.email,
          contactPerson: suppliers.contactPerson,
          isActive:      suppliers.isActive,
        })
        .from(suppliers)
        .where(eq(suppliers.isActive, true))
        .orderBy(suppliers.name),
      [] as { id: string; name: string; phone: string | null; email: string | null; contactPerson: string | null; isActive: boolean }[],
    ),
    safe(
      db.select({ supplierId: materials.preferredSupplierId, cnt: count() })
        .from(materials)
        .where(eq(materials.isActive, true))
        .groupBy(materials.preferredSupplierId),
      [] as { supplierId: string | null; cnt: number }[],
    ),
  ]);

  const matCountMap = new Map(matCounts.map((r) => [r.supplierId ?? "", Number(r.cnt)]));
  const rows: VendorRow[] = supplierRows.map((s) => ({
    ...s,
    materialCount: matCountMap.get(s.id) ?? 0,
  }));

  const card: React.CSSProperties = { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>← Planning &amp; Engineering</a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Vendors / Suppliers</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Approved supplier list. Preferred suppliers auto-populate in BOM entry and flow through to Purchase Requisitions.
            Managed in <a href="/admin/master-list/suppliers" style={{ color: "#1a56db", textDecoration: "none" }}>Admin → Master List</a>.
          </p>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Active Suppliers",    value: rows.length,                                    accent: "#1a56db" },
            { label: "With Preferred Mats", value: rows.filter((r) => r.materialCount > 0).length, accent: "#057a55" },
          ].map((k) => (
            <div key={k.label} style={{ ...card, padding: "1.1rem 1.4rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginTop: "0.3rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>No active suppliers found.</p>
            <a href="/admin/master-list/suppliers" style={{ color: "#1a56db", fontSize: "0.875rem" }}>Add in Admin →</a>
          </div>
        ) : (
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Supplier Name", "Contact Person", "Phone", "Email", "Preferred For"].map((h) => (
                      <th key={h} style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id} style={{ borderBottom: idx < rows.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>{row.name}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{row.contactPerson ?? <span style={{ color: "#d1d5db" }}>—</span>}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151", fontFamily: "monospace", fontSize: "0.82rem" }}>{row.phone ?? <span style={{ color: "#d1d5db" }}>—</span>}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#1a56db", fontSize: "0.82rem" }}>
                        {row.email
                          ? <a href={`mailto:${row.email}`} style={{ color: "#1a56db", textDecoration: "none" }}>{row.email}</a>
                          : <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {row.materialCount > 0
                          ? <span style={{ background: "#eff6ff", color: "#1e40af", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>{row.materialCount} material{row.materialCount !== 1 ? "s" : ""}</span>
                          : <span style={{ color: "#d1d5db", fontSize: "0.78rem" }}>None set</span>}
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
