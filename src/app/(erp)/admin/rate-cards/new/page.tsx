export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, activityDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { NewRateCardForm } from "./NewRateCardForm";

const ACCENT = "#dc2626";

export default async function NewRateCardPage() {
  await getAuthUser();

  const allProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .orderBy(projects.name);

  const allActivities = await db
    .select({
      id:           activityDefinitions.id,
      activityCode: activityDefinitions.activityCode,
      activityName: activityDefinitions.activityName,
      scopeName:    activityDefinitions.scopeName,
    })
    .from(activityDefinitions)
    .where(eq(activityDefinitions.isActive, true))
    .orderBy(activityDefinitions.activityCode);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "640px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/rate-cards" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Developer Rate Cards</a>
        </div>
        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            New Rate Card
          </h1>
          <p style={{ margin: "0 0 0 1.25rem", color: "#6b7280", fontSize: "0.9rem" }}>
            Set a gross rate per unit for a project activity with deduction percentages.
          </p>
        </header>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <NewRateCardForm projects={allProjects} activities={allActivities} />
        </div>
      </div>
    </main>
  );
}
