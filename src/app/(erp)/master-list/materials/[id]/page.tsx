export const dynamic = "force-dynamic";
import { db } from "@/db";
import { materials, suppliers, bomStandards, activityDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [mat] = await db
    .select({
      id:                  materials.id,
      code:                materials.code,
      name:                materials.name,
      unit:                materials.unit,
      category:            materials.category,
      adminPrice:          materials.adminPrice,
      priceVersion:        materials.priceVersion,
      isActive:            materials.isActive,
      createdAt:           materials.createdAt,
      supId:               suppliers.id,
      supName:             suppliers.name,
    })
    .from(materials)
    .leftJoin(suppliers, eq(materials.preferredSupplierId, suppliers.id))
    .where(eq(materials.id, id));

  if (!mat) notFound();

  const bomRows = await db
    .select({
      id:              bomStandards.id,
      unitModel:       bomStandards.unitModel,
      unitType:        bomStandards.unitType,
      quantityPerUnit: bomStandards.quantityPerUnit,
      isActive:        bomStandards.isActive,
      scopeName:       activityDefinitions.scopeName,
      activityCode:    activityDefinitions.activityCode,
    })
    .from(bomStandards)
    .leftJoin(activityDefinitions, eq(bomStandards.activityDefId, activityDefinitions.id))
    .where(eq(bomStandards.materialId, id))
    .orderBy(bomStandards.isActive);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/materials" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Materials Master</a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: "0 0 0.2rem", fontFamily: "monospace", fontSize: "0.85rem", color: "#6b7280" }}>{mat.code}</p>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{mat.name}</h1>
            <span style={{
              display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
              background: mat.isActive ? "#dcfce7" : "#f3f4f6", color: mat.isActive ? "#166534" : "#6b7280",
            }}>{mat.isActive ? "Active" : "Inactive"}</span>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div><div style={LABEL}>Unit of Measure</div><div style={VALUE}>{mat.unit}</div></div>
            <div><div style={LABEL}>Category</div><div style={VALUE}>{mat.category}</div></div>
            <div>
              <div style={LABEL}>Admin Price (PHP)</div>
              <div style={{ ...VALUE, fontSize: "1.1rem" }}>
                PHP {Number(mat.adminPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>v{mat.priceVersion}</div>
            </div>
            <div>
              <div style={LABEL}>Preferred Supplier</div>
              {mat.supId
                ? <a href={`/master-list/vendors/${mat.supId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{mat.supName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div><div style={LABEL}>Added</div><div style={VALUE}>{new Date(mat.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div></div>
          </div>
        </div>

        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
          BOM Appearances ({bomRows.length})
        </h2>
        {bomRows.length === 0 ? (
          <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
            This material has not been added to any BOM standard yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Activity Code", "Scope Name", "Unit Model", "Unit Type", "Qty / Unit", "Status"].map((h, i) => (
                    <th key={i} style={{ padding: "0.6rem 0.9rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bomRows.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: b.isActive ? 1 : 0.5 }}>
                    <td style={{ padding: "0.6rem 0.9rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#374151" }}>{b.activityCode ?? "—"}</td>
                    <td style={{ padding: "0.6rem 0.9rem", color: "#111827" }}>{b.scopeName ?? "—"}</td>
                    <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{b.unitModel}</td>
                    <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{b.unitType}</td>
                    <td style={{ padding: "0.6rem 0.9rem", fontWeight: 600, color: "#374151" }}>{Number(b.quantityPerUnit).toFixed(4)}</td>
                    <td style={{ padding: "0.6rem 0.9rem" }}>
                      <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: b.isActive ? "#dcfce7" : "#f3f4f6", color: b.isActive ? "#166534" : "#6b7280" }}>
                        {b.isActive ? "Active" : "Versioned"}
                      </span>
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
