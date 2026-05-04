export const dynamic = "force-dynamic";
import { db } from "@/db";
import { suppliers, materials } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { EditSupplierForm } from "./EditSupplierForm";

const ACCENT = "#dc2626";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [sup] = await db
    .select({
      id:        suppliers.id,
      name:      suppliers.name,
      isActive:  suppliers.isActive,
      createdAt: suppliers.createdAt,
    })
    .from(suppliers)
    .where(eq(suppliers.id, id));

  if (!sup) notFound();

  const [{ matCount }] = await db
    .select({ matCount: count() })
    .from(materials)
    .where(eq(materials.preferredSupplierId, id));

  const linkedMaterials = await db
    .select({ id: materials.id, code: materials.code, name: materials.name, unit: materials.unit, isActive: materials.isActive })
    .from(materials)
    .where(eq(materials.preferredSupplierId, id))
    .orderBy(materials.name);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "800px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/suppliers" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Suppliers</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{sup.name}</h1>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: sup.isActive ? "#f0fdf4" : "#f3f4f6", color: sup.isActive ? "#057a55" : "#9ca3af" }}>
                {sup.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#f3f4f6", color: "#374151" }}>
                {matCount} material{matCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Edit Supplier</h2>
          <EditSupplierForm id={String(sup.id)} initialName={String(sup.name)} isActive={Boolean(sup.isActive)} />
        </div>

        {linkedMaterials.length > 0 && (
          <>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>Linked Materials ({linkedMaterials.length})</h2>
            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Code", "Name", "Unit", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linkedMaterials.map((m) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: m.isActive ? 1 : 0.5 }}>
                      <td style={{ padding: "0.6rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#374151" }}>{m.code}</td>
                      <td style={{ padding: "0.6rem 1rem", fontWeight: 500, color: "#111827" }}>
                        <a href={`/admin/materials/${m.id}`} style={{ color: ACCENT, textDecoration: "none" }}>{m.name}</a>
                      </td>
                      <td style={{ padding: "0.6rem 1rem", color: "#6b7280" }}>{m.unit}</td>
                      <td style={{ padding: "0.6rem 1rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: m.isActive ? "#f0fdf4" : "#f3f4f6", color: m.isActive ? "#057a55" : "#9ca3af" }}>
                          {m.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
