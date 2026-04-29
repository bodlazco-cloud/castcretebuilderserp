export const dynamic = "force-dynamic";
import { db } from "@/db";
import { suppliers, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [vendor] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, id));

  if (!vendor) notFound();

  const preferredMaterials = await db
    .select({ id: materials.id, code: materials.code, name: materials.name, unit: materials.unit, adminPrice: materials.adminPrice, isActive: materials.isActive })
    .from(materials)
    .where(eq(materials.preferredSupplierId, id))
    .orderBy(materials.code);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/vendors" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Vendors / Suppliers</a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{vendor.name}</h1>
            <span style={{
              display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
              background: vendor.isActive ? "#dcfce7" : "#f3f4f6", color: vendor.isActive ? "#166534" : "#6b7280",
            }}>{vendor.isActive ? "Active" : "Inactive"}</span>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div><div style={LABEL}>Vendor ID</div><div style={{ ...VALUE, fontFamily: "monospace", fontSize: "0.8rem" }}>{vendor.id}</div></div>
            <div><div style={LABEL}>Added</div><div style={VALUE}>{new Date(vendor.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div></div>
          </div>
        </div>

        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
          Preferred For ({preferredMaterials.length} materials)
        </h2>
        {preferredMaterials.length === 0 ? (
          <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
            No materials set this vendor as preferred yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Code", "Material Name", "Unit", "Admin Price", "Status", ""].map((h, i) => (
                    <th key={i} style={{ padding: "0.6rem 0.9rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preferredMaterials.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.6rem 0.9rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#374151" }}>{m.code}</td>
                    <td style={{ padding: "0.6rem 0.9rem", fontWeight: 500, color: "#111827" }}>{m.name}</td>
                    <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{m.unit}</td>
                    <td style={{ padding: "0.6rem 0.9rem", color: "#374151" }}>
                      PHP {Number(m.adminPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.6rem 0.9rem" }}>
                      <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: m.isActive ? "#dcfce7" : "#f3f4f6", color: m.isActive ? "#166534" : "#6b7280" }}>
                        {m.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 0.9rem", textAlign: "right" }}>
                      <a href={`/master-list/materials/${m.id}`} style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
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
