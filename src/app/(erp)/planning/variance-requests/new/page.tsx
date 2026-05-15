export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, masterBomEntries, materials, activityDefinitions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NewVarianceForm } from "./NewVarianceForm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

export default async function NewVarianceRequestPage() {
  const [projectList, bomEntries, materialList] = await Promise.all([
    safe(
      db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
      [] as { id: string; name: string }[],
    ),
    safe(
      db.select({
        id:           masterBomEntries.id,
        projectId:    masterBomEntries.projectId,
        unitModel:    masterBomEntries.unitModel,
        unitType:     masterBomEntries.unitType,
        status:       masterBomEntries.status,
        materialName: materials.name,
        activityName: activityDefinitions.activityName,
      })
        .from(masterBomEntries)
        .leftJoin(materials,           eq(masterBomEntries.materialId,    materials.id))
        .leftJoin(activityDefinitions, eq(masterBomEntries.activityDefId, activityDefinitions.id))
        .where(and(eq(masterBomEntries.isActive, true), eq(masterBomEntries.status, "APPROVED")))
        .orderBy(masterBomEntries.unitModel),
      [] as { id: string; projectId: string; unitModel: string; unitType: string; status: string; materialName: string | null; activityName: string | null }[],
    ),
    safe(
      db.select({ id: materials.id, name: materials.name, unit: materials.unit, code: materials.code })
        .from(materials)
        .where(eq(materials.isActive, true))
        .orderBy(materials.name),
      [] as { id: string; name: string; unit: string; code: string }[],
    ),
  ]);

  return (
    <div className="p-6 bg-zinc-950 min-h-screen text-white">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">New Variance Request</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Submit a BOM change or procurement overage for approval</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <NewVarianceForm projects={projectList} bomEntries={bomEntries} materials={materialList} />
        </div>
      </div>
    </div>
  );
}
