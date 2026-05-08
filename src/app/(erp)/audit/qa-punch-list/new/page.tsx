export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, projectUnits, blocks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { NewPunchListForm } from "./NewPunchListForm";

const ACCENT = "#7e3af2";

export default async function NewPunchListItemPage() {
  await getAuthUser();

  const [projectRows, unitRows] = await Promise.all([
    db.select({ id: projects.id, name: projects.name })
      .from(projects)
      .orderBy(asc(projects.name)),
    db.select({
      id:        projectUnits.id,
      unitCode:  projectUnits.unitCode,
      projectId: projectUnits.projectId,
      blockName: blocks.blockName,
    })
      .from(projectUnits)
      .leftJoin(blocks, eq(projectUnits.blockId, blocks.id))
      .orderBy(asc(projectUnits.unitCode)),
  ]);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "680px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit/qa-punch-list" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← QA Punch List</a>
        </div>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Add Punch List Item</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Record a quality defect or open issue for tracking and closeout.</p>
        </div>
        <NewPunchListForm projects={projectRows} units={unitRows} />
      </div>
    </main>
  );
}
