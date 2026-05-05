export const dynamic = "force-dynamic";
import { db } from "@/db";
import { bomStandards, activityDefinitions, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { BomStandardForm } from "../BomStandardForm";

export default async function EditBomStandardPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [row] = await db
    .select({
      id:              bomStandards.id,
      activityDefId:   bomStandards.activityDefId,
      unitModel:       bomStandards.unitModel,
      unitType:        bomStandards.unitType,
      materialId:      bomStandards.materialId,
      quantityPerUnit: bomStandards.quantityPerUnit,
      baseRatePhp:     bomStandards.baseRatePhp,
      isActive:        bomStandards.isActive,
    })
    .from(bomStandards)
    .where(eq(bomStandards.id, id));

  if (!row) notFound();

  const [activityRows, materialRows] = await Promise.all([
    db.select({ id: activityDefinitions.id, activityCode: activityDefinitions.activityCode, activityName: activityDefinitions.activityName })
      .from(activityDefinitions).orderBy(activityDefinitions.activityCode),
    db.select({ id: materials.id, code: materials.code, name: materials.name, unit: materials.unit })
      .from(materials).where(eq(materials.isActive, true)).orderBy(materials.code),
  ]);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "700px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/bom-standards" style={{ fontSize: "0.8rem", color: "#dc2626", textDecoration: "none" }}>← BOM Standards</a>
        </div>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Edit BOM Line</h1>
        <div style={{ marginBottom: "1.5rem" }}>
          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 600, background: row.isActive ? "#f0fdf4" : "#f3f4f6", color: row.isActive ? "#057a55" : "#9ca3af" }}>
            {row.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <BomStandardForm
            mode="edit"
            initial={{
              id: row.id,
              activityDefId:   String(row.activityDefId),
              unitModel:       row.unitModel,
              unitType:        row.unitType,
              materialId:      String(row.materialId),
              quantityPerUnit: String(row.quantityPerUnit),
              baseRatePhp:     row.baseRatePhp ? String(row.baseRatePhp) : undefined,
              isActive:        row.isActive,
            }}
            activities={activityRows.map((a) => ({ id: String(a.id), activityCode: String(a.activityCode), activityName: String(a.activityName) }))}
            materials={materialRows.map((m) => ({ id: String(m.id), code: String(m.code), name: String(m.name), unit: String(m.unit) }))}
          />
        </div>
      </div>
    </main>
  );
}
