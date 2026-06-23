export const dynamic = "force-dynamic";

import { db } from "@/db";
import { suppliers, materials } from "@/db/schema";
import { count, isNotNull } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

export default async function ProcurementVendorsPage() {
  const [supplierRows, matCounts] = await Promise.all([
    safe(
      db.select({
        id:            suppliers.id,
        name:          suppliers.name,
        contactPerson: suppliers.contactPerson,
        phone:         suppliers.phone,
        email:         suppliers.email,
        address:       suppliers.address,
        isActive:      suppliers.isActive,
        createdAt:     suppliers.createdAt,
      })
        .from(suppliers)
        .orderBy(suppliers.name),
      [] as { id: string; name: string; contactPerson: string | null; phone: string | null; email: string | null; address: string | null; isActive: boolean; createdAt: Date }[],
    ),
    safe(
      db.select({ supplierId: materials.preferredSupplierId, cnt: count() })
        .from(materials)
        .where(isNotNull(materials.preferredSupplierId))
        .groupBy(materials.preferredSupplierId),
      [] as { supplierId: string | null; cnt: number }[],
    ),
  ]);

  const matCountMap = new Map(matCounts.map((r) => [r.supplierId ?? "", Number(r.cnt)]));

  const card: React.CSSProperties = { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };

  const totalVendors = supplierRows.length;
  const activeCount  = supplierRows.filter((s) => s.isActive).length;
  const inactiveCount = supplierRows.filter((s) => !s.isActive).length;

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/procurement" style={{ fontSize: "0.8rem", color: "#e3a008", textDecoration: "none" }}>← Procurement &amp; Stock</a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Vendors / Suppliers</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Full supplier list with contact details and material associations.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Vendors", value: totalVendors,  accent: "#e3a008" },
            { label: "Active",        value: activeCount,   accent: "#057a55" },
            { label: "Inactive",      value: inactiveCount, accent: "#dc2626" },
          ].map((k) => (
            <div key={k.label} style={{ ...card, padding: "1.1rem 1.4rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginTop: "0.3rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {supplierRows.length === 0 ? (
          <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>No suppliers found.</p>
            <a href="/admin/master-list/suppliers" style={{ color: "#1a56db", fontSize: "0.875rem" }}>Add in Admin →</a>
          </div>
        ) : (
          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Name", "Contact Person", "Phone", "Email", "Address", "Materials", "Status", "Since"].map((h) => (
                      <th key={h} style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supplierRows.map((row, idx) => {
                    const matCount = matCountMap.get(row.id) ?? 0;
                    const addr = row.address ?? null;
                    const truncAddr = addr && addr.length > 40 ? addr.slice(0, 40) + "…" : addr;
                    const since = row.createdAt
                      ? new Date(row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—";
                    return (
                      <tr key={row.id} style={{ borderBottom: idx < supplierRows.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 700, whiteSpace: "nowrap" }}>{row.name}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>
                          {row.contactPerson ?? <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#374151", whiteSpace: "nowrap" }}>
                          {row.phone ?? <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontSize: "0.82rem" }}>
                          {row.email
                            ? <a href={`mailto:${row.email}`} style={{ color: "#1a56db", textDecoration: "none" }}>{row.email}</a>
                            : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem", maxWidth: "200px" }}>
                          {truncAddr ?? <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {matCount > 0
                            ? <span style={{ background: "#eff6ff", color: "#1e40af", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>{matCount}</span>
                            : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {row.isActive
                            ? <span style={{ background: "#dcfce7", color: "#166534", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>Active</span>
                            : <span style={{ background: "#fef2f2", color: "#b91c1c", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>Inactive</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem", whiteSpace: "nowrap" }}>{since}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
