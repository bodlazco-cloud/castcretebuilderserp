export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  projects, projectUnits, blocks,
  unitActivities, activityDefinitions,
  taskAssignments, subcontractors,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { TaggingForm } from "./TaggingForm";

export type TaggingUnit = {
  unitId:    string;
  unitCode:  string;
  unitModel: string;
  blockName: string;
  lotNumber: string;
};

export type TaggingActivity = {
  activityId:   string;
  unitId:       string;
  activityCode: string;
  activityName: string;
  status:       string;
  subconName:   string | null;
};

export default async function MilestoneTaggingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) notFound();

  const units = await db
    .select({
      unitId:    projectUnits.id,
      unitCode:  projectUnits.unitCode,
      unitModel: projectUnits.unitModel,
      blockName: blocks.blockName,
      lotNumber: projectUnits.lotNumber,
    })
    .from(projectUnits)
    .innerJoin(blocks, eq(projectUnits.blockId, blocks.id))
    .where(eq(projectUnits.projectId, projectId))
    .orderBy(blocks.blockName, projectUnits.lotNumber);

  // Activities for all units in this project, with linked subcon via active NTP
  const activities = await db
    .select({
      activityId:   unitActivities.id,
      unitId:       unitActivities.unitId,
      activityCode: activityDefinitions.activityCode,
      activityName: activityDefinitions.activityName,
      status:       unitActivities.status,
      subconName:   subcontractors.name,
    })
    .from(unitActivities)
    .innerJoin(activityDefinitions, eq(unitActivities.activityDefId, activityDefinitions.id))
    .innerJoin(projectUnits, eq(unitActivities.unitId, projectUnits.id))
    .leftJoin(taskAssignments, and(
      eq(taskAssignments.unitId, unitActivities.unitId),
      eq(taskAssignments.status, "ACTIVE"),
    ))
    .leftJoin(subcontractors, eq(subcontractors.id, taskAssignments.subconId))
    .where(eq(projectUnits.projectId, projectId))
    .orderBy(activityDefinitions.activityCode);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <a href="/construction/sites" style={{ fontSize: "0.82rem", color: "#057a55", textDecoration: "none" }}>
          ← Sites
        </a>
      </div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>
          Milestone Tagging — {project.name}
        </h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
          Log daily activity progress per unit. 100% marks the activity complete.
        </p>
      </div>
      <TaggingForm units={units} activities={activities} />
    </main>
  );
}
