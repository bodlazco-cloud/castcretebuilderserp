export const dynamic = "force-dynamic";

import { db } from "@/db";
import { projects, materials, projectUnitModels, suppliers } from "@/db/schema";
import { phaseScopes, phaseActivities } from "@/db/schema/phases";
import { eq } from "drizzle-orm";
import { BomEntryForm } from "../BomEntryForm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

export default async function NewBomEntryPage() {
  const [projectRows, scopeRows, activityRows, unitModelRows, materialRows, vendorRows] = await Promise.all([
    safe(
      db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .orderBy(projects.name),
      [] as { id: string; name: string }[],
    ),
    safe(
      db
        .select({
          id:         phaseScopes.id,
          code:       phaseScopes.code,
          name:       phaseScopes.name,
          categoryId: phaseScopes.categoryId,
        })
        .from(phaseScopes)
        .where(eq(phaseScopes.isActive, true))
        .orderBy(phaseScopes.sequenceOrder, phaseScopes.code),
      [] as { id: string; code: string; name: string; categoryId: string }[],
    ),
    safe(
      db
        .select({
          id:      phaseActivities.id,
          scopeId: phaseActivities.scopeId,
          code:    phaseActivities.code,
          name:    phaseActivities.name,
        })
        .from(phaseActivities)
        .where(eq(phaseActivities.isActive, true))
        .orderBy(phaseActivities.sequenceOrder, phaseActivities.code),
      [] as { id: string; scopeId: string; code: string; name: string }[],
    ),
    safe(
      db
        .select({ projectId: projectUnitModels.projectId, unitModel: projectUnitModels.name })
        .from(projectUnitModels)
        .orderBy(projectUnitModels.name),
      [] as { projectId: string; unitModel: string }[],
    ),
    safe(
      db
        .select({
          id:                  materials.id,
          code:                materials.code,
          name:                materials.name,
          unit:                materials.unit,
          category:            materials.category,
          adminPrice:          materials.adminPrice,
          preferredSupplierId: materials.preferredSupplierId,
        })
        .from(materials)
        .where(eq(materials.isActive, true))
        .orderBy(materials.code),
      [] as { id: string; code: string; name: string; unit: string; category: string | null; adminPrice: string | null; preferredSupplierId: string | null }[],
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
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning/bom" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>
              ← BOM Register
            </a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>New BOM Entry</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Define material quantities per scope of work, activity, unit model, and unit type.
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <BomEntryForm
            projects={projectRows}
            phaseScopes={scopeRows}
            phaseActivities={activityRows}
            unitModels={unitModelRows}
            materials={materialRows}
            vendors={vendorRows}
          />
        </div>
      </div>
    </main>
  );
}
