export const dynamic = "force-dynamic";
import { db } from "@/db";
import { subcontractors, projects, activityDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { NewSubconRateCardForm } from "./NewSubconRateCardForm";

export default async function NewSubconRateCardPage() {
  await getAuthUser();

  const [subconRows, projectRows, activityRows] = await Promise.all([
    db.select({ id: subcontractors.id, name: subcontractors.name, code: subcontractors.code })
      .from(subcontractors)
      .where(eq(subcontractors.isActive, true))
      .orderBy(subcontractors.name),
    db.select({ id: projects.id, name: projects.name })
      .from(projects)
      .orderBy(projects.name),
    db.select({ id: activityDefinitions.id, activityCode: activityDefinitions.activityCode, activityName: activityDefinitions.activityName, scopeName: activityDefinitions.scopeName })
      .from(activityDefinitions)
      .where(eq(activityDefinitions.isActive, true))
      .orderBy(activityDefinitions.activityCode),
  ]);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "700px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/subcon-rate-cards" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Subcontractor Rate Cards</a>
        </div>
        <h1 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>New Subcontractor Rate Card</h1>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
          <NewSubconRateCardForm
            subcontractors={subconRows.map((s) => ({ id: String(s.id), name: String(s.name), code: String(s.code) }))}
            projects={projectRows.map((p) => ({ id: String(p.id), name: String(p.name) }))}
            activities={activityRows.map((a) => ({ id: String(a.id), activityCode: String(a.activityCode), activityName: String(a.activityName), scopeName: String(a.scopeName) }))}
          />
        </div>
      </div>
    </main>
  );
}
