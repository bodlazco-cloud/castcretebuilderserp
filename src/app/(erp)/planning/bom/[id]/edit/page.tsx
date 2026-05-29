export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { masterBomEntries, materials, projects, suppliers } from "@/db/schema";
import { phaseScopes, phaseActivities } from "@/db/schema/phases";
import { eq, and } from "drizzle-orm";
import { BomGroupEditForm } from "./BomGroupEditForm";

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

  // Load the reference line to get group identity
  const [ref] = await db
    .select({
      id:              masterBomEntries.id,
      status:          masterBomEntries.status,
      projectId:       masterBomEntries.projectId,
      projectName:     projects.name,
      phaseScopeId:    masterBomEntries.phaseScopeId,
      phaseActivityId: masterBomEntries.phaseActivityId,
      unitModel:       masterBomEntries.unitModel,
      unitType:        masterBomEntries.unitType,
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

  if (!ref) notFound();
  if (ref.status !== "DRAFT") redirect("/planning/bom");

  // Load all active DRAFT lines in the same group
  const groupLines = await db
    .select({
      id:              masterBomEntries.id,
      materialId:      masterBomEntries.materialId,
      quantityPerUnit: masterBomEntries.quantityPerUnit,
      equipmentType:   masterBomEntries.equipmentType,
    })
    .from(masterBomEntries)
    .where(
      and(
        eq(masterBomEntries.projectId,   ref.projectId),
        eq(masterBomEntries.phaseScopeId, ref.phaseScopeId!),
        eq(masterBomEntries.unitModel,   ref.unitModel),
        eq(masterBomEntries.unitType,    ref.unitType),
        eq(masterBomEntries.isActive,    true),
        eq(masterBomEntries.status,      "DRAFT"),
      ),
    );

  const [materialRows, vendorRows] = await Promise.all([
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
  ]);

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning/bom" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>
              ← BOM Register
            </a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Edit Draft BOM</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Add, edit, or remove material lines for this draft entry.
          </p>
        </div>

        {/* Context card */}
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#1e40af", marginBottom: "1.25rem", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          <span><strong>Project:</strong> {ref.projectName ?? "—"}</span>
          {ref.scopeCode && <span><strong>Scope:</strong> [{ref.scopeCode}] {ref.scopeName}</span>}
          {ref.activityCode && <span><strong>Activity:</strong> [{ref.activityCode}] {ref.activityName}</span>}
          <span><strong>Unit Model:</strong> {ref.unitModel}</span>
          <span><strong>Unit Type:</strong> {ref.unitType}</span>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <BomGroupEditForm
            referenceId={ref.id}
            initialLines={groupLines.map((l) => ({
              id:            l.id,
              materialId:    l.materialId,
              qty:           l.quantityPerUnit,
              equipmentType: l.equipmentType ?? "",
            }))}
            materials={materialRows}
            vendors={vendorRows}
          />
        </div>
      </div>
    </main>
  );
}
