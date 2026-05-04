export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, activityDefinitions, subcontractors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { ManpowerLogForm } from "../ManpowerLogForm";

const ACCENT = "#1a56db";

export default async function NewManpowerLogPage() {
  await getAuthUser();

  const [projectRows, activityRows, subconRows] = await Promise.all([
    db.select({ id: projects.id, name: projects.name })
      .from(projects).orderBy(projects.name),
    db.select({
        id:           activityDefinitions.id,
        activityCode: activityDefinitions.activityCode,
        activityName: activityDefinitions.activityName,
      })
      .from(activityDefinitions)
      .where(eq(activityDefinitions.isActive, true))
      .orderBy(activityDefinitions.activityCode),
    db.select({ id: subcontractors.id, name: subcontractors.name, code: subcontractors.code })
      .from(subcontractors)
      .where(eq(subcontractors.stopAssignment, false))
      .orderBy(subcontractors.code),
  ]);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning/resource-forecasting" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Resource Forecasting</a>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Log Manpower</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Record daily headcount for a project site — both subcontractor and direct staff.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <ManpowerLogForm
            projects={projectRows}
            activities={activityRows}
            subcontractors={subconRows}
          />
        </div>
      </div>
    </main>
  );
}
