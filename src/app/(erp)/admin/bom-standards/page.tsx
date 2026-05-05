export const dynamic = "force-dynamic";
import { db } from "@/db";
import { bomStandards, activityDefinitions, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#dc2626";

export default async function BomStandardsPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:              bomStandards.id,
      unitModel:       bomStandards.unitModel,
      unitType:        bomStandards.unitType,
      quantityPerUnit: bomStandards.quantityPerUnit,
      version:         bomStandards.version,
      isActive:        bomStandards.isActive,
      activityCode:    activityDefinitions.activityCode,
      activityName:    activityDefinitions.activityName,
      matCode:         materials.code,
      matName:         materials.name,
      matUnit:         materials.unit,
      adminPrice:      materials.adminPrice,
    })
    .from(bomStandards)
    .leftJoin(activityDefinitions, eq(bomStandards.activityDefId, activityDefinitions.id))
    .leftJoin(materials,           eq(bomStandards.materialId,    materials.id))
    .orderBy(activityDefinitions.activityCode, bomStandards.unitModel);

  const active = rows.filter((r) => r.isActive).length;
  const fmt = (v: string | null, qty: string) =>
    v != null ? `PHP ${(Number(v) * Number(qty)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1300px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>BOM Standards</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>{active} active lines · {rows.length} total</p>
          </div>
          <a href="/admin/bom-standards/new" style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT, color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>+ New BOM Line</a>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No BOM standards configured yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "1000px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Activity", "Unit Model", "Unit Type", "Material", "Qty / Unit", "Cost / Unit", "Ver", "Status", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: [4, 5].includes(i) ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.isActive ? 1 : 0.5 }}>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#374151" }}>{r.activityCode ?? "—"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{r.activityName ?? ""}</div>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151" }}>{r.unitModel}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: "#f3f4f6", color: "#374151" }}>{r.unitType}</span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <div style={{ fontWeight: 500, color: "#374151" }}>{r.matName ?? "—"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace" }}>{r.matCode}</div>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace" }}>
                        {Number(r.quantityPerUnit).toFixed(4)} {r.matUnit}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#374151" }}>
                        {fmt(r.adminPrice, r.quantityPerUnit)}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>v{r.version}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: r.isActive ? "#f0fdf4" : "#f3f4f6", color: r.isActive ? "#057a55" : "#9ca3af" }}>
                          {r.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                        <a href={`/admin/bom-standards/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>Edit →</a>
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
