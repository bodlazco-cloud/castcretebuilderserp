export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, activityDefinitions, projectActivityProgress } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { ActivityProgressClient } from "./ActivityProgressClient";

const ACCENT = "#057a55";

export default async function ActivityProgressPage() {
  await getAuthUser();

  const [projectRows, activityRows, progressRows] = await Promise.all([
    db.select({ id: projects.id, name: projects.name })
      .from(projects)
      .orderBy(projects.name),
    db.select({
        id:               activityDefinitions.id,
        category:         activityDefinitions.category,
        scopeName:        activityDefinitions.scopeName,
        activityCode:     activityDefinitions.activityCode,
        activityName:     activityDefinitions.activityName,
        weightInScopePct: activityDefinitions.weightInScopePct,
      })
      .from(activityDefinitions)
      .where(eq(activityDefinitions.isActive, true))
      .orderBy(activityDefinitions.category, activityDefinitions.sequenceOrder),
    db.select({
        projectId:     projectActivityProgress.projectId,
        activityDefId: projectActivityProgress.activityDefId,
        completionPct: projectActivityProgress.completionPct,
      })
      .from(projectActivityProgress),
  ]);

  // Build initialProgress map: projectId -> activityDefId -> pct
  const initialProgress: Record<string, Record<string, number>> = {};
  for (const row of progressRows) {
    const pid = String(row.projectId);
    const aid = String(row.activityDefId);
    initialProgress[pid] ??= {};
    initialProgress[pid][aid] = Number(row.completionPct);
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1000px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Activity Progress</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            Track % completion per scope of work activity, per project. Category completion rolls up automatically.
          </p>
        </div>
        {projectRows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No projects found. <a href="/master-list/projects/new" style={{ color: ACCENT }}>Add a project →</a>
          </div>
        ) : (
          <ActivityProgressClient
            projects={projectRows.map((p) => ({ id: String(p.id), name: String(p.name) }))}
            allActivities={activityRows.map((a) => ({
              id:               String(a.id),
              category:         String(a.category),
              scopeName:        String(a.scopeName),
              activityCode:     String(a.activityCode),
              activityName:     String(a.activityName),
              weightInScopePct: String(a.weightInScopePct),
              currentPct:       0,
            }))}
            initialProgress={initialProgress}
          />
        )}
      </div>
    </main>
  );
}
