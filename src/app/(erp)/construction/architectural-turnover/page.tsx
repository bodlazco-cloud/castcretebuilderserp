export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projectUnits, projects, blocks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import TurnoverClient from "./TurnoverClient";

export default async function ArchitecturalTurnoverPage() {
  await getAuthUser();

  const units = await db
    .select({
      id:            projectUnits.id,
      unitCode:      projectUnits.unitCode,
      unitModel:     projectUnits.unitModel,
      lotNumber:     projectUnits.lotNumber,
      contractPrice: projectUnits.contractPrice,
      blockName:     blocks.blockName,
      projectName:   projects.name,
    })
    .from(projectUnits)
    .leftJoin(blocks,    eq(projectUnits.blockId,   blocks.id))
    .leftJoin(projects,  eq(projectUnits.projectId, projects.id))
    .where(and(
      eq(projectUnits.currentCategory, "ARCHITECTURAL"),
      isNull(projectUnits.turnedOverAt),
    ))
    .orderBy(projects.name, blocks.blockName, projectUnits.lotNumber);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <TurnoverClient
        units={units.map((u) => ({
          ...u,
          blockName: u.blockName ?? "—",
          projectName: u.projectName ?? "—",
        }))}
      />
    </main>
  );
}
