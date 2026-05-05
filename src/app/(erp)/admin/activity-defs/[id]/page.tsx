export const dynamic = "force-dynamic";
import { db } from "@/db";
import { activityDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { ActivityDefForm } from "../ActivityDefForm";

export default async function EditActivityDefPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [row] = await db
    .select()
    .from(activityDefinitions)
    .where(eq(activityDefinitions.id, id));

  if (!row) notFound();

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "700px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/activity-defs" style={{ fontSize: "0.8rem", color: "#dc2626", textDecoration: "none" }}>← Scope of Work</a>
        </div>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
          {row.activityCode} — {row.activityName}
        </h1>
        <div style={{ marginBottom: "1.5rem" }}>
          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 600, background: row.isActive ? "#f0fdf4" : "#f3f4f6", color: row.isActive ? "#057a55" : "#9ca3af" }}>
            {row.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <ActivityDefForm
            mode="edit"
            initial={{
              id: row.id,
              category: row.category as "STRUCTURAL" | "ARCHITECTURAL" | "TURNOVER",
              scopeCode: row.scopeCode,
              scopeName: row.scopeName,
              activityCode: row.activityCode,
              activityName: row.activityName,
              standardDurationDays: row.standardDurationDays,
              weightInScopePct: Number(row.weightInScopePct),
              sequenceOrder: row.sequenceOrder,
              isActive: row.isActive,
            }}
          />
        </div>
      </div>
    </main>
  );
}
