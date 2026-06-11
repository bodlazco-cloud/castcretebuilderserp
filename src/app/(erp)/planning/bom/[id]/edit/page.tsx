export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { masterBomEntries, materials, projects, suppliers, projectUnits } from "@/db/schema";
import { phaseScopes, phaseActivities } from "@/db/schema/phases";
import { eq } from "drizzle-orm";
import { BomLineEditForm } from "./BomLineEditForm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

export default async function EditBomEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [entry] = await db
    .select({
      id:              masterBomEntries.id,
      status:          masterBomEntries.status,
      projectId:       masterBomEntries.projectId,
      projectName:     projects.name,
      unitModel:       masterBomEntries.unitModel,
      unitType:        masterBomEntries.unitType,
      materialId:      masterBomEntries.materialId,
      quantityPerUnit: masterBomEntries.quantityPerUnit,
      equipmentType:   masterBomEntries.equipmentType,
      phaseScopeId:    masterBomEntries.phaseScopeId,
      phaseActivityId: masterBomEntries.phaseActivityId,
      scopeCode:       phaseScopes.code,
      scopeName:       phaseScopes.name,
      activityCode:    phaseActivities.code,
      activityName:    phaseActivities.name,
    })
    .from(masterBomEntries)
    .leftJoin(projects,        eq(masterBomEntries.projectId,       projects.id))
    .leftJoin(phaseScopes,     eq(masterBomEntries.phaseScopeId,    phaseScopes.id))
    .leftJoin(phaseActivities, eq(masterBomEntries.phaseActivityId, phaseActivities.id))
    .where(eq(masterBomEntries.id, id));

  if (!entry) notFound();
  if (entry.status !== "DRAFT" && entry.status !== "REJECTED") redirect("/planning/bom");

  const [materialRows, vendorRows, scopeRows, activityRows, unitModelRows] = await Promise.all([
    safe(
      db
        .select({
          id:                  materials.id,
          code:                materials.code,
          name:                materials.name,
          unit:                materials.unit,
          adminPrice:          materials.adminPrice,
          preferredSupplierId: materials.preferredSupplierId,
        })
        .from(materials)
        .where(eq(materials.isActive, true))
        .orderBy(materials.code),
      [] as { id: string; code: string; name: string; unit: string; adminPrice: string | null; preferredSupplierId: string | null }[],
    ),
    safe(
      db
        .select({ id: suppliers.id, name: suppliers.name })
        .from(suppliers)
        .where(eq(suppliers.isActive, true))
        .orderBy(suppliers.name),
      [] as { id: string; name: string }[],
    ),
    safe(
      db
        .select({ id: phaseScopes.id, code: phaseScopes.code, name: phaseScopes.name, categoryId: phaseScopes.categoryId })
        .from(phaseScopes)
        .where(eq(phaseScopes.isActive, true))
        .orderBy(phaseScopes.sequenceOrder),
      [] as { id: string; code: string; name: string; categoryId: string }[],
    ),
    safe(
      db
        .select({ id: phaseActivities.id, scopeId: phaseActivities.scopeId, code: phaseActivities.code, name: phaseActivities.name })
        .from(phaseActivities)
        .where(eq(phaseActivities.isActive, true))
        .orderBy(phaseActivities.sequenceOrder),
      [] as { id: string; scopeId: string; code: string; name: string }[],
    ),
    safe(
      db
        .selectDistinct({ unitModel: projectUnits.unitModel })
        .from(projectUnits)
        .where(eq(projectUnits.projectId, entry.projectId))
        .orderBy(projectUnits.unitModel),
      [] as { unitModel: string }[],
    ),
  ]);

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning/bom" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>
              ← BOM Register
            </a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Edit BOM Entry</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Update the material, quantity, or equipment type for this draft line.
          </p>
        </div>

        {/* Context card */}
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#1e40af", marginBottom: "1.25rem", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <span><strong>Project:</strong> {entry.projectName ?? "—"}</span>
          <span><strong>Status:</strong> {entry.status}</span>
        </div>

        <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#713f12", marginBottom: "1.25rem" }}>
          Saving will return this line to <strong>Draft</strong> so it can be resubmitted for Admin / BOD approval.
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <BomLineEditForm
            id={entry.id}
            initialScopeId={entry.phaseScopeId ?? ""}
            initialActivityId={entry.phaseActivityId ?? ""}
            initialUnitModel={entry.unitModel}
            initialUnitType={entry.unitType}
            initialMaterialId={entry.materialId}
            initialQty={entry.quantityPerUnit}
            initialEquipmentType={entry.equipmentType ?? ""}
            phaseScopes={scopeRows}
            phaseActivities={activityRows}
            unitModels={unitModelRows.map((u) => u.unitModel)}
            materials={materialRows}
            vendors={vendorRows}
          />
        </div>
      </div>
    </main>
  );
}
