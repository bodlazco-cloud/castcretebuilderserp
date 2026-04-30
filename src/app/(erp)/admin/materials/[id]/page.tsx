export const dynamic = "force-dynamic";
import { db } from "@/db";
import { materials, materialPriceHistory, suppliers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { MaterialActions } from "./MaterialActions";

const ACCENT = "#dc2626";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [mat] = await db
    .select({
      id:           materials.id,
      code:         materials.code,
      name:         materials.name,
      unit:         materials.unit,
      category:     materials.category,
      adminPrice:   materials.adminPrice,
      priceVersion: materials.priceVersion,
      isActive:     materials.isActive,
      createdAt:    materials.createdAt,
      supplierName: suppliers.name,
    })
    .from(materials)
    .leftJoin(suppliers, eq(materials.preferredSupplierId, suppliers.id))
    .where(eq(materials.id, id));

  if (!mat) notFound();

  const priceHistory = await db
    .select({
      id:            materialPriceHistory.id,
      oldPrice:      materialPriceHistory.oldPrice,
      newPrice:      materialPriceHistory.newPrice,
      version:       materialPriceHistory.version,
      effectiveFrom: materialPriceHistory.effectiveFrom,
      createdAt:     materialPriceHistory.createdAt,
    })
    .from(materialPriceHistory)
    .where(eq(materialPriceHistory.materialId, id))
    .orderBy(desc(materialPriceHistory.version));

  const fmt = (v: string) => `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "800px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/materials" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Materials & Pricing</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{mat.name}</h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#f3f4f6", color: "#374151" }}>
                {mat.code}
              </span>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#f3f4f6", color: "#374151" }}>
                {mat.category}
              </span>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: mat.isActive ? "#f0fdf4" : "#f3f4f6", color: mat.isActive ? "#057a55" : "#9ca3af" }}>
                {mat.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          </div>
        </div>

        {/* Current price card */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.25rem" }}>Current Admin Price</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827" }}>{fmt(mat.adminPrice)}</div>
            <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.15rem" }}>per {mat.unit} · v{mat.priceVersion} · Preferred supplier: {mat.supplierName ?? "none"}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Actions</h2>
          <MaterialActions id={mat.id} isActive={mat.isActive} />
        </div>

        {/* Price history */}
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>Price History</h2>
        {priceHistory.length === 0 ? (
          <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No price changes recorded yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Version", "Old Price", "New Price", "Effective From", "Changed On"].map((h, i) => (
                    <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i >= 1 && i <= 2 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceHistory.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.65rem 1rem", fontWeight: 600, color: "#374151" }}>v{p.version}</td>
                    <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#6b7280", textDecoration: "line-through" }}>{fmt(p.oldPrice)}</td>
                    <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#057a55" }}>{fmt(p.newPrice)}</td>
                    <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{p.effectiveFrom}</td>
                    <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{new Date(p.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</td>
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
