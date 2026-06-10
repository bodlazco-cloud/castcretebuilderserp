export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { phaseCategories, phaseScopes } from "@/db/schema/phases";
import { IssueNtpForm } from "./IssueNtpForm";

const ACCENT = "#057a55";

export default async function IssueNtpPage() {
  const user = await getAuthUser();

  const [projectsList, units, blocksList, subcontractors, categories, scopes] = await Promise.all([
    db.select({ id: schema.projects.id, name: schema.projects.name, status: schema.projects.status })
      .from(schema.projects).orderBy(schema.projects.name),
    db.select({
      id: schema.projectUnits.id, unitCode: schema.projectUnits.unitCode,
      projectId: schema.projectUnits.projectId, unitModel: schema.projectUnits.unitModel,
      unitType: schema.projectUnits.unitType, blockId: schema.projectUnits.blockId,
    }).from(schema.projectUnits).where(eq(schema.projectUnits.status, "PENDING"))
      .orderBy(schema.projectUnits.unitCode),
    db.select({ id: schema.blocks.id, blockName: schema.blocks.blockName, projectId: schema.blocks.projectId })
      .from(schema.blocks).orderBy(schema.blocks.blockName),
    db.select({
      id: schema.subcontractors.id, name: schema.subcontractors.name,
      code: schema.subcontractors.code, tradeTypes: schema.subcontractors.tradeTypes,
    }).from(schema.subcontractors).where(eq(schema.subcontractors.isActive, true))
      .orderBy(schema.subcontractors.name),
    db.select({ id: phaseCategories.id, code: phaseCategories.code, name: phaseCategories.name, sequenceOrder: phaseCategories.sequenceOrder })
      .from(phaseCategories).where(eq(phaseCategories.isActive, true))
      .orderBy(phaseCategories.sequenceOrder),
    db.select({ id: phaseScopes.id, name: phaseScopes.name, code: phaseScopes.code, categoryId: phaseScopes.categoryId, sequenceOrder: phaseScopes.sequenceOrder })
      .from(phaseScopes).where(eq(phaseScopes.isActive, true))
      .orderBy(phaseScopes.sequenceOrder),
  ]);

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "2rem", maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>
            ← Back to Construction
          </a>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: `4px solid ${ACCENT}` }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Issue Notice to Proceed (NTP)</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              BOD approval required before NTPs can be issued on a project.
            </p>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <IssueNtpForm
              projects={projectsList}
              units={units.map((u) => ({ ...u, unitType: u.unitType ?? "MID" }))}
              blocks={blocksList}
              subcontractors={subcontractors.map((s) => ({ ...s, tradeTypes: s.tradeTypes ?? [] }))}
              categories={categories}
              scopes={scopes}
              userId={user?.id ?? ""}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
