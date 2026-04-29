export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, activityDefinitions, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { NewCoForm } from "../NewCoForm";

const ACCENT = "#1a56db";

export default async function NewChangeOrderPage() {
  await getAuthUser();

  const [projectRows, activityRows, materialRows] = await Promise.all([
    db.select({ id: projects.id, name: projects.name })
      .from(projects).orderBy(projects.name),
    db.select({
        id:           activityDefinitions.id,
        projectId:    activityDefinitions.projectId,
        activityCode: activityDefinitions.activityCode,
        activityName: activityDefinitions.activityName,
        scopeName:    activityDefinitions.scopeName,
      })
      .from(activityDefinitions)
      .where(eq(activityDefinitions.isActive, true))
      .orderBy(activityDefinitions.activityCode),
    db.select({ id: materials.id, code: materials.code, name: materials.name, unit: materials.unit })
      .from(materials)
      .where(eq(materials.isActive, true))
      .orderBy(materials.code),
  ]);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning/change-orders" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Change Orders</a>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>New Change Order</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Submit an engineering change request for review and approval.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <NewCoForm
            projects={projectRows}
            activities={activityRows}
            materials={materialRows}
          />
        </div>
      </div>
    </main>
  );
}
