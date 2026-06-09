export const dynamic = "force-dynamic";
import { db } from "@/db";
import { taskAssignments, subcontractors, projects, projectUnits } from "@/db/schema";
import { phaseCategories, phaseScopes } from "@/db/schema/phases";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import { EditNtpForm } from "./EditNtpForm";

const ACCENT = "#057a55";

export default async function EditNtpPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [ntp] = await db
    .select({
      id:          taskAssignments.id,
      status:      taskAssignments.status,
      subconId:    taskAssignments.subconId,
      workType:    taskAssignments.workType,
      startDate:   taskAssignments.startDate,
      endDate:     taskAssignments.endDate,
      category:    taskAssignments.category,
      phaseScopeId: taskAssignments.phaseScopeId,
      unitCode:    projectUnits.unitCode,
      projName:    projects.name,
    })
    .from(taskAssignments)
    .leftJoin(projectUnits, eq(taskAssignments.unitId, projectUnits.id))
    .leftJoin(projects,     eq(taskAssignments.projectId, projects.id))
    .where(eq(taskAssignments.id, id));

  if (!ntp) notFound();
  if (ntp.status !== "DRAFT" && ntp.status !== "REJECTED") {
    redirect(`/construction/ntp/${id}`);
  }

  const [allSubcons, allScopes, allCategories] = await Promise.all([
    db.select({ id: subcontractors.id, name: subcontractors.name, code: subcontractors.code, tradeTypes: subcontractors.tradeTypes })
      .from(subcontractors).where(eq(subcontractors.isActive, true)).orderBy(subcontractors.name),
    db.select({ id: phaseScopes.id, name: phaseScopes.name, code: phaseScopes.code, categoryId: phaseScopes.categoryId, sequenceOrder: phaseScopes.sequenceOrder })
      .from(phaseScopes).where(eq(phaseScopes.isActive, true)).orderBy(phaseScopes.sequenceOrder),
    db.select({ id: phaseCategories.id, code: phaseCategories.code, name: phaseCategories.name, sequenceOrder: phaseCategories.sequenceOrder })
      .from(phaseCategories).where(eq(phaseCategories.isActive, true)).orderBy(phaseCategories.sequenceOrder),
  ]);

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href={`/construction/ntp/${id}`} style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>
            ← Back to NTP
          </a>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: `4px solid ${ACCENT}` }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Edit NTP — {ntp.unitCode}</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              {ntp.projName} · Status: <strong>{ntp.status}</strong>
            </p>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <EditNtpForm
              ntpId={id}
              initial={{
                subconId:     ntp.subconId,
                workType:     ntp.workType as any,
                startDate:    ntp.startDate,
                endDate:      ntp.endDate,
                phaseScopeId: ntp.phaseScopeId ?? "",
              }}
              subcontractors={allSubcons.map((s) => ({ ...s, tradeTypes: s.tradeTypes ?? [] }))}
              categories={allCategories}
              scopes={allScopes}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
