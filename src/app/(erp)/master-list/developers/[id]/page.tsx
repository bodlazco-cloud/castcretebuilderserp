export const dynamic = "force-dynamic";
import { db } from "@/db";
import { developers, projects, developerRateCards, developerRateCardDeductions, phaseCategories, phaseScopes, phaseActivities, projectUnits } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getAuthUser, isAdminOrBod } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { DevRateCards } from "./DevRateCards";
import { EditDeveloperForm } from "./EditDeveloperForm";

export default async function DeveloperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const isAdmin = await isAdminOrBod();
  const { id } = await params;

  const [dev] = await db.select().from(developers).where(eq(developers.id, id));
  if (!dev) notFound();

  const projectRows = await db
    .select({ id: projects.id, name: projects.name, status: projects.status, contractValue: projects.contractValue, startDate: projects.startDate })
    .from(projects)
    .where(eq(projects.developerId, id))
    .orderBy(projects.name);

  const devProjectIds = projectRows.map((p) => p.id);
  const DUMMY = ["00000000-0000-0000-0000-000000000000"];

  let rateCardRows: {
    id: string; projectName: string | null;
    phaseActivityId: string | null; unitModel: string | null; unitType: string | null;
    phaseCategoryName: string | null; phaseScopeName: string | null;
    phaseActivityCode: string | null; phaseActivityName: string | null;
    grossRatePerUnit: string; retentionPct: string; dpRecoupmentPct: string;
    taxPct: string; version: number; isActive: boolean;
  }[] = [];
  let deductionRows: { id: string; rateCardId: string; name: string; deductionPct: string; isActive: boolean }[] = [];
  let phaseCategoryList: { id: string; name: string }[] = [];
  let phaseScopeList: { id: string; categoryId: string; name: string }[] = [];
  let phaseActivityList: { id: string; scopeId: string; code: string; name: string }[] = [];
  let unitModelOptions: { projectId: string; projectName: string; unitModel: string; unitType: string }[] = [];

  try {
    [rateCardRows, phaseCategoryList, phaseScopeList, phaseActivityList] = await Promise.all([
      db.select({
        id:                developerRateCards.id,
        projectName:       projects.name,
        phaseActivityId:   developerRateCards.phaseActivityId,
        unitModel:         developerRateCards.unitModel,
        unitType:          developerRateCards.unitType,
        phaseCategoryName: phaseCategories.name,
        phaseScopeName:    phaseScopes.name,
        phaseActivityCode: phaseActivities.code,
        phaseActivityName: phaseActivities.name,
        grossRatePerUnit:  developerRateCards.grossRatePerUnit,
        retentionPct:      developerRateCards.retentionPct,
        dpRecoupmentPct:   developerRateCards.dpRecoupmentPct,
        taxPct:            developerRateCards.taxPct,
        version:           developerRateCards.version,
        isActive:          developerRateCards.isActive,
      })
      .from(developerRateCards)
      .leftJoin(projects,        eq(developerRateCards.projectId,       projects.id))
      .leftJoin(phaseActivities, eq(developerRateCards.phaseActivityId, phaseActivities.id))
      .leftJoin(phaseScopes,     eq(phaseActivities.scopeId,            phaseScopes.id))
      .leftJoin(phaseCategories, eq(phaseScopes.categoryId,             phaseCategories.id))
      .where(inArray(developerRateCards.projectId, devProjectIds.length > 0 ? devProjectIds : DUMMY))
      .orderBy(developerRateCards.createdAt),
      db.select({ id: phaseCategories.id, name: phaseCategories.name }).from(phaseCategories).where(eq(phaseCategories.isActive, true)).orderBy(phaseCategories.sequenceOrder),
      db.select({ id: phaseScopes.id, categoryId: phaseScopes.categoryId, name: phaseScopes.name }).from(phaseScopes).where(eq(phaseScopes.isActive, true)).orderBy(phaseScopes.sequenceOrder),
      db.select({ id: phaseActivities.id, scopeId: phaseActivities.scopeId, code: phaseActivities.code, name: phaseActivities.name }).from(phaseActivities).where(eq(phaseActivities.isActive, true)).orderBy(phaseActivities.sequenceOrder),
    ]);

    if (devProjectIds.length > 0) {
      const unitRows = await db
        .select({ projectId: projectUnits.projectId, unitModel: projectUnits.unitModel, unitType: projectUnits.unitType })
        .from(projectUnits)
        .where(inArray(projectUnits.projectId, devProjectIds))
        .orderBy(projectUnits.unitModel);
      unitModelOptions = unitRows.map((u) => ({
        projectId:   u.projectId,
        projectName: projectRows.find((p) => p.id === u.projectId)?.name ?? "",
        unitModel:   u.unitModel,
        unitType:    u.unitType,
      }));
    }

    if (rateCardRows.length > 0) {
      deductionRows = await db
        .select({ id: developerRateCardDeductions.id, rateCardId: developerRateCardDeductions.rateCardId, name: developerRateCardDeductions.name, deductionPct: developerRateCardDeductions.deductionPct, isActive: developerRateCardDeductions.isActive })
        .from(developerRateCardDeductions)
        .where(inArray(developerRateCardDeductions.rateCardId, rateCardRows.map((r) => r.id)));
    }
  } catch {
    // schema not yet migrated — page still loads without rate cards
  }

  const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" };
  const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

  const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
    ACTIVE:    { bg: "#dcfce7", color: "#166534" },
    BIDDING:   { bg: "#eff6ff", color: "#1e40af" },
    ON_HOLD:   { bg: "#fef9c3", color: "#713f12" },
    COMPLETED: { bg: "#f0fdf4", color: "#166534" },
    CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/developers" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Developers</a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{dev.name}</h1>
            <span style={{
              display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
              background: dev.isActive ? "#dcfce7" : "#f3f4f6", color: dev.isActive ? "#166534" : "#6b7280",
            }}>{dev.isActive ? "Active" : "Inactive"}</span>
          </div>
          {isAdmin && <EditDeveloperForm developer={{ id: dev.id, name: dev.name }} />}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div><div style={LABEL}>Developer ID</div><div style={{ ...VALUE, fontFamily: "monospace", fontSize: "0.8rem" }}>{dev.id}</div></div>
            <div><div style={LABEL}>Added</div><div style={VALUE}>{new Date(dev.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div></div>
          </div>
        </div>

        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
          Linked Projects ({projectRows.length})
        </h2>
        {projectRows.length === 0 ? (
          <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
            No projects linked to this developer yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Project", "Status", "Contract Value", "Start Date", ""].map((h, i) => (
                    <th key={i} style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projectRows.map((p) => {
                  const sc = STATUS_COLOR[p.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#111827" }}>{p.name}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ display: "inline-block", padding: "0.15rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: sc.bg, color: sc.color }}>{p.status}</span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>
                        PHP {Number(p.contractValue).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{p.startDate ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                        <a href={`/master-list/projects/${p.id}`} style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <DevRateCards
          devProjects={projectRows.map((p) => ({ id: p.id, name: p.name }))}
          rateCards={rateCardRows}
          deductions={deductionRows}
          phaseCategories={phaseCategoryList}
          phaseScopes={phaseScopeList}
          phaseActivities={phaseActivityList}
          unitModelOptions={unitModelOptions}
          isAdmin={isAdmin}
        />
      </div>
    </main>
  );
}
