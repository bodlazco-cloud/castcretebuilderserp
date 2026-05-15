export const dynamic = "force-dynamic";

import { db } from "@/db";
import { projects, activityDefinitions, materials, projectUnitModels, suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BomEntryForm } from "../BomEntryForm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

export default async function NewBomEntryPage() {
  const [projectRows, sowRows, unitModelRows, materialRows, vendorRows] = await Promise.all([
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
          id:           activityDefinitions.id,
          projectId:    activityDefinitions.projectId,
          scopeCode:    activityDefinitions.scopeCode,
          scopeName:    activityDefinitions.scopeName,
          activityCode: activityDefinitions.activityCode,
          activityName: activityDefinitions.activityName,
        })
        .from(activityDefinitions)
        .where(eq(activityDefinitions.isActive, true))
        .orderBy(activityDefinitions.scopeCode, activityDefinitions.sequenceOrder),
      [] as { id: string; projectId: string; scopeCode: string; scopeName: string; activityCode: string; activityName: string }[],
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
        .select({ id: materials.id, code: materials.code, name: materials.name, unit: materials.unit })
        .from(materials)
        .where(eq(materials.isActive, true))
        .orderBy(materials.code),
      [] as { id: string; code: string; name: string; unit: string }[],
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
    <main className="min-h-screen bg-slate-950 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <p className="text-xs text-slate-400 mb-1">
            <a href="/planning/bom" className="hover:text-white transition-colors">← BOM Register</a>
          </p>
          <h1 className="text-2xl font-bold text-white">New BOM Entry</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Define material quantities per scope of work, activity, unit model, and unit type.
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <BomEntryForm
            projects={projectRows}
            sowItems={sowRows}
            unitModels={unitModelRows}
            materials={materialRows}
            vendors={vendorRows}
          />
        </div>
      </div>
    </main>
  );
}
