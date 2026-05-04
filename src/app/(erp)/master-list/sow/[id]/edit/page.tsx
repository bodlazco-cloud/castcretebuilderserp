export const dynamic = "force-dynamic";
import { db } from "@/db";
import { activityDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { EditSowForm } from "../EditSowForm";

export default async function EditSowPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [activity] = await db
    .select({
      id:                   activityDefinitions.id,
      category:             activityDefinitions.category,
      scopeCode:            activityDefinitions.scopeCode,
      scopeName:            activityDefinitions.scopeName,
      activityCode:         activityDefinitions.activityCode,
      activityName:         activityDefinitions.activityName,
      standardDurationDays: activityDefinitions.standardDurationDays,
      weightInScopePct:     activityDefinitions.weightInScopePct,
      sequenceOrder:        activityDefinitions.sequenceOrder,
      isActive:             activityDefinitions.isActive,
    })
    .from(activityDefinitions)
    .where(eq(activityDefinitions.id, id));

  if (!activity) notFound();

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "720px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href={`/master-list/sow/${id}`} style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Back to Activity</a>
        </div>
        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, borderLeft: "4px solid #6366f1", paddingLeft: "0.75rem" }}>
            Edit Scope Item
          </h1>
          <p style={{ margin: "0 0 0 1.25rem", color: "#6b7280", fontSize: "0.9rem" }}>
            {activity.activityCode} — {activity.scopeName}
          </p>
        </header>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <EditSowForm
            id={id}
            isActive={activity.isActive}
            initial={{
              category:             activity.category,
              scopeCode:            activity.scopeCode,
              scopeName:            activity.scopeName,
              activityCode:         activity.activityCode,
              activityName:         activity.activityName,
              standardDurationDays: activity.standardDurationDays,
              weightInScopePct:     String(activity.weightInScopePct),
              sequenceOrder:        activity.sequenceOrder,
            }}
          />
        </div>
      </div>
    </main>
  );
}
