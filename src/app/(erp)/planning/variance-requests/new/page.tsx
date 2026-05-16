export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, masterBomEntries, materials } from "@/db/schema";
import { phaseActivities } from "@/db/schema/phases";
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
        activityName: phaseActivities.name,
      })
        .from(masterBomEntries)
        .leftJoin(materials,       eq(masterBomEntries.materialId,       materials.id))
        .leftJoin(phaseActivities, eq(masterBomEntries.phaseActivityId,  phaseActivities.id))
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
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning/variance-requests" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>
              ← Variance Requests
            </a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>New Variance Request</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Submit a BOM change or procurement overage for approval
          </p>
        </div>
        <div style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem 2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <NewVarianceForm projects={projectList} bomEntries={bomEntries} materials={materialList} />
        </div>
      </div>
    </main>
  );
}
