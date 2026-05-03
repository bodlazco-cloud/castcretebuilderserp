export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getProjectUnitGrid } from "@/actions/dashboard";
import { UnitMatrix } from "./UnitMatrix";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [project] = await db
    .select({ id: projects.id, name: projects.name, status: projects.status })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) notFound();

  const units = await getProjectUnitGrid(projectId);

  const completedCount  = units.filter((u) => u.status === "COMPLETED").length;
  const activeCount     = units.filter((u) => u.status === "ACTIVE").length;
  const flaggedCount    = units.filter((u) => u.isFlagged).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <a href="/construction/sites" style={{ fontSize: "0.82rem", color: "#057a55", textDecoration: "none" }}>
          ← Sites
        </a>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>
            {project.name}
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            {units.length} units · {completedCount} completed · {activeCount} active
            {flaggedCount > 0 && ` · ${flaggedCount} flagged`}
          </p>
        </div>
        <a
          href={`/construction/sites/${projectId}/tagging`}
          style={{
            padding: "0.5rem 1rem", borderRadius: "6px", background: "#057a55",
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}
        >
          Log Progress →
        </a>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {[
          { color: "#bbf7d0", border: "#16a34a", label: "Completed" },
          { color: "#fef08a", border: "#ca8a04", label: "Active / In Progress" },
          { color: "#fecaca", border: "#dc2626", label: "Flagged / Delayed" },
          { color: "#f3f4f6", border: "#d1d5db", label: "Pending" },
        ].map(({ color, border, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "#374151" }}>
            <span style={{ width: "14px", height: "14px", borderRadius: "3px", background: color, border: `1px solid ${border}`, display: "inline-block" }} />
            {label}
          </div>
        ))}
      </div>

      <UnitMatrix units={units} projectId={projectId} />
    </main>
  );
}
