export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  projects, developers, blocks, projectUnits, projectUnitModels,
  developerRateCards, developerRateCardDeductions,
  subcontractorRateCards, subcontractorRateCardDeductions,
  phaseCategories, phaseScopes, phaseActivities,
  masterBomEntries, materials,
} from "@/db/schema";
import { eq, inArray, isNull, or, and } from "drizzle-orm";
import { getAuthUser, isAdminOrBod } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { ApproveProjectButton, AddBlockForm, EditBlockForm, DeleteBlockButton, AddUnitForm, UnitRow, UnitModelManager } from "./ProjectActions";
import { EditProjectForm } from "./EditProjectForm";
import { DevRateCards } from "../../developers/[id]/DevRateCards";
import { SubconRateCards } from "../../subcontractors/[id]/SubconRateCards";

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: "#dcfce7", color: "#166534" },
  BIDDING:   { bg: "#eff6ff", color: "#1e40af" },
  ON_HOLD:   { bg: "#fef9c3", color: "#713f12" },
  COMPLETED: { bg: "#f0fdf4", color: "#166534" },
  CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
};

function php(v: string | null) {
  if (!v) return "—";
  return "PHP " + Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const isAdmin = await isAdminOrBod();
  const { id } = await params;

  const [project] = await db
    .select({
      id:                     projects.id,
      name:                   projects.name,
      status:                 projects.status,
      contractValue:          projects.contractValue,
      developerAdvance:       projects.developerAdvance,
      advanceRecovered:       projects.advanceRecovered,
      targetUnitsPerMonth:    projects.targetUnitsPerMonth,
      minOperatingCashBuffer: projects.minOperatingCashBuffer,
      startDate:              projects.startDate,
      endDate:                projects.endDate,
      createdAt:              projects.createdAt,
      bodApprovedAt:          projects.bodApprovedAt,
      devName:                developers.name,
      devId:                  developers.id,
    })
    .from(projects)
    .leftJoin(developers, eq(projects.developerId, developers.id))
    .where(eq(projects.id, id));

  if (!project) notFound();

  const blockRows = await db
    .select({ id: blocks.id, blockName: blocks.blockName, totalLots: blocks.totalLots })
    .from(blocks)
    .where(eq(blocks.projectId, id))
    .orderBy(blocks.blockName);

  const [unitRows, unitModelRows] = await Promise.all([
    blockRows.length > 0
      ? db
          .select({ id: projectUnits.id, blockId: projectUnits.blockId, unitCode: projectUnits.unitCode, lotNumber: projectUnits.lotNumber, unitModel: projectUnits.unitModel, unitType: projectUnits.unitType, status: projectUnits.status, contractPrice: projectUnits.contractPrice })
          .from(projectUnits)
          .where(eq(projectUnits.projectId, id))
          .orderBy(projectUnits.unitCode)
      : Promise.resolve([]),
    db
      .select({ id: projectUnitModels.id, name: projectUnitModels.name })
      .from(projectUnitModels)
      .where(eq(projectUnitModels.projectId, id))
      .orderBy(projectUnitModels.name)
      .catch(() => [] as { id: string; name: string }[]),
  ]);

  const unitModelNames = unitModelRows.map((m) => m.name);

  // BOQ (Developer Rate Cards) and Labor BOM (Subcontractor Rate Cards) for this project
  type DevRateCardRow = {
    id: string; projectId: string; projectName: string | null;
    phaseScopeId: string | null; phaseActivityId: string | null;
    unitModel: string | null; unitType: string | null;
    phaseCategoryName: string | null; phaseScopeName: string | null;
    phaseActivityCode: string | null; phaseActivityName: string | null;
    grossRatePerUnit: string; retentionPct: string; dpRecoupmentPct: string;
    taxPct: string; version: number; isActive: boolean;
  };
  type SubconRateCardRow = {
    id: string; projectId: string; projectName: string | null;
    phaseScopeId: string | null; phaseActivityId: string | null;
    unitModel: string | null; unitType: string | null;
    phaseCategoryName: string | null; phaseScopeName: string | null;
    phaseActivityCode: string | null; phaseActivityName: string | null;
    ratePerUnit: string; retentionPct: string; version: number; isActive: boolean;
  };
  type Deduction = { id: string; rateCardId: string; name: string; deductionPct: string; isActive: boolean };

  let devRateCards: DevRateCardRow[] = [];
  let devDeductions: Deduction[] = [];
  let subconRateCards: SubconRateCardRow[] = [];
  let subconDeductions: Deduction[] = [];
  let phaseCategoryList: { id: string; name: string }[] = [];
  let phaseScopeList: { id: string; categoryId: string; name: string }[] = [];
  let phaseActivityList: { id: string; scopeId: string; code: string; name: string }[] = [];
  let devUnitModelOptions: { projectId: string; projectName: string; unitModel: string; unitType: string }[] = [];
  let subconUnitModelOptions: { projectId: string; unitModel: string }[] = [];

  try {
    [devRateCards, subconRateCards, phaseCategoryList, phaseScopeList, phaseActivityList] = await Promise.all([
      db.select({
        id:                developerRateCards.id,
        projectId:         developerRateCards.projectId,
        projectName:       projects.name,
        phaseScopeId:      developerRateCards.phaseScopeId,
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
      .where(eq(developerRateCards.projectId, id))
      .orderBy(developerRateCards.createdAt),

      db.select({
        id:                subcontractorRateCards.id,
        projectId:         subcontractorRateCards.projectId,
        projectName:       projects.name,
        phaseScopeId:      subcontractorRateCards.phaseScopeId,
        phaseActivityId:   subcontractorRateCards.phaseActivityId,
        unitModel:         subcontractorRateCards.unitModel,
        unitType:          subcontractorRateCards.unitType,
        phaseCategoryName: phaseCategories.name,
        phaseScopeName:    phaseScopes.name,
        phaseActivityCode: phaseActivities.code,
        phaseActivityName: phaseActivities.name,
        ratePerUnit:       subcontractorRateCards.ratePerUnit,
        retentionPct:      subcontractorRateCards.retentionPct,
        version:           subcontractorRateCards.version,
        isActive:          subcontractorRateCards.isActive,
      })
      .from(subcontractorRateCards)
      .leftJoin(projects,        eq(subcontractorRateCards.projectId,       projects.id))
      .leftJoin(phaseActivities, eq(subcontractorRateCards.phaseActivityId, phaseActivities.id))
      .leftJoin(phaseScopes,     eq(phaseActivities.scopeId,                phaseScopes.id))
      .leftJoin(phaseCategories, eq(phaseScopes.categoryId,                 phaseCategories.id))
      .where(or(eq(subcontractorRateCards.projectId, id), isNull(subcontractorRateCards.projectId)))
      .orderBy(subcontractorRateCards.createdAt),

      db.select({ id: phaseCategories.id, name: phaseCategories.name }).from(phaseCategories).where(eq(phaseCategories.isActive, true)).orderBy(phaseCategories.sequenceOrder),
      db.select({ id: phaseScopes.id, categoryId: phaseScopes.categoryId, name: phaseScopes.name }).from(phaseScopes).where(eq(phaseScopes.isActive, true)).orderBy(phaseScopes.sequenceOrder),
      db.select({ id: phaseActivities.id, scopeId: phaseActivities.scopeId, code: phaseActivities.code, name: phaseActivities.name }).from(phaseActivities).where(eq(phaseActivities.isActive, true)).orderBy(phaseActivities.sequenceOrder),
    ]);

    devUnitModelOptions = unitModelRows.map((m) => ({ projectId: id, projectName: project.name, unitModel: m.name, unitType: "" }));
    subconUnitModelOptions = unitModelRows.map((m) => ({ projectId: id, unitModel: m.name }));

    if (devRateCards.length > 0) {
      devDeductions = await db
        .select({ id: developerRateCardDeductions.id, rateCardId: developerRateCardDeductions.rateCardId, name: developerRateCardDeductions.name, deductionPct: developerRateCardDeductions.deductionPct, isActive: developerRateCardDeductions.isActive })
        .from(developerRateCardDeductions)
        .where(inArray(developerRateCardDeductions.rateCardId, devRateCards.map((r) => r.id)));
    }
    if (subconRateCards.length > 0) {
      subconDeductions = await db
        .select({ id: subcontractorRateCardDeductions.id, rateCardId: subcontractorRateCardDeductions.rateCardId, name: subcontractorRateCardDeductions.name, deductionPct: subcontractorRateCardDeductions.deductionPct, isActive: subcontractorRateCardDeductions.isActive })
        .from(subcontractorRateCardDeductions)
        .where(inArray(subcontractorRateCardDeductions.rateCardId, subconRateCards.map((r) => r.id)));
    }
  } catch {
    // schema not yet migrated — page still loads without rate cards
  }

  // Material BOM (from Planning's Master BOM Register) for this project
  type MaterialBomRow = {
    id: string;
    unitModel: string;
    unitType: string;
    quantityPerUnit: string;
    status: string;
    equipmentType: string | null;
    categoryName: string | null;
    scopeCode: string | null;
    scopeName: string | null;
    activityCode: string | null;
    activityName: string | null;
    matCode: string | null;
    matName: string | null;
    matUnit: string | null;
  };
  let materialBomRows: MaterialBomRow[] = [];
  try {
    materialBomRows = await db
      .select({
        id:              masterBomEntries.id,
        unitModel:       masterBomEntries.unitModel,
        unitType:        masterBomEntries.unitType,
        quantityPerUnit: masterBomEntries.quantityPerUnit,
        status:          masterBomEntries.status,
        equipmentType:   masterBomEntries.equipmentType,
        categoryName:    phaseCategories.name,
        scopeCode:       phaseScopes.code,
        scopeName:       phaseScopes.name,
        activityCode:    phaseActivities.code,
        activityName:    phaseActivities.name,
        matCode:         materials.code,
        matName:         materials.name,
        matUnit:         materials.unit,
      })
      .from(masterBomEntries)
      .leftJoin(phaseScopes, eq(masterBomEntries.phaseScopeId, phaseScopes.id))
      .leftJoin(phaseCategories, eq(phaseScopes.categoryId, phaseCategories.id))
      .leftJoin(phaseActivities, eq(masterBomEntries.phaseActivityId, phaseActivities.id))
      .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
      .where(and(eq(masterBomEntries.projectId, id), eq(masterBomEntries.isActive, true)))
      .orderBy(masterBomEntries.unitModel, masterBomEntries.unitType, phaseCategories.sequenceOrder, phaseScopes.code);
  } catch {
    // schema not yet migrated — page still loads without material BOM
  }

  const BOM_STATUS_BADGE: Record<string, { bg: string; color: string }> = {
    DRAFT:          { bg: "#f3f4f6", color: "#6b7280" },
    PENDING_REVIEW: { bg: "#fef9c3", color: "#713f12" },
    APPROVED:       { bg: "#dcfce7", color: "#166534" },
    REJECTED:       { bg: "#fef2f2", color: "#b91c1c" },
  };

  // Material BOM — collapsible: Model Type → Unit Type → Category → Scope of Work → Materials
  type BomScopeGroup = { scopeKey: string; scopeCode: string | null; scopeName: string | null; activityCode: string | null; activityName: string | null; lines: MaterialBomRow[] };
  type BomCategoryGroup = { categoryName: string; scopes: Map<string, BomScopeGroup> };
  type BomUnitTypeGroup = { unitType: string; categories: Map<string, BomCategoryGroup> };
  type BomModelGroup = { unitModel: string; unitTypes: Map<string, BomUnitTypeGroup> };

  const bomModelMap = new Map<string, BomModelGroup>();
  for (const row of materialBomRows) {
    if (!bomModelMap.has(row.unitModel)) bomModelMap.set(row.unitModel, { unitModel: row.unitModel, unitTypes: new Map() });
    const modelGroup = bomModelMap.get(row.unitModel)!;

    if (!modelGroup.unitTypes.has(row.unitType)) modelGroup.unitTypes.set(row.unitType, { unitType: row.unitType, categories: new Map() });
    const unitTypeGroup = modelGroup.unitTypes.get(row.unitType)!;

    const catKey = row.categoryName ?? "Uncategorized";
    if (!unitTypeGroup.categories.has(catKey)) unitTypeGroup.categories.set(catKey, { categoryName: catKey, scopes: new Map() });
    const categoryGroup = unitTypeGroup.categories.get(catKey)!;

    const scopeKey = row.scopeCode ?? "unscoped";
    if (!categoryGroup.scopes.has(scopeKey)) {
      categoryGroup.scopes.set(scopeKey, { scopeKey, scopeCode: row.scopeCode, scopeName: row.scopeName, activityCode: row.activityCode, activityName: row.activityName, lines: [] });
    }
    categoryGroup.scopes.get(scopeKey)!.lines.push(row);
  }

  const bomSummaryStyle = (depth: number): React.CSSProperties => ({
    cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: "0.6rem",
    padding: depth === 0 ? "0.7rem 1.1rem" : depth === 1 ? "0.55rem 1.1rem 0.55rem 1.85rem" : depth === 2 ? "0.5rem 1.1rem 0.5rem 2.6rem" : "0.45rem 1.1rem 0.45rem 3.35rem",
    background: depth === 0 ? "#f9fafb" : depth === 1 ? "#fff" : depth === 2 ? "#fafafa" : "#fcfcfd",
    borderBottom: "1px solid #f3f4f6",
    fontWeight: depth <= 1 ? 700 : 600,
    fontSize: depth === 0 ? "0.88rem" : depth === 1 ? "0.82rem" : "0.78rem",
    color: "#111827",
  });

  // Blocks & Units — group units within each block by unit model
  type ProjectUnitRow = (typeof unitRows)[number];
  type BlockModelGroup = { unitModel: string; units: ProjectUnitRow[] };
  function groupUnitsByModel(units: ProjectUnitRow[]): BlockModelGroup[] {
    const map = new Map<string, BlockModelGroup>();
    for (const u of units) {
      const key = u.unitModel ?? "Unassigned";
      if (!map.has(key)) map.set(key, { unitModel: key, units: [] });
      map.get(key)!.units.push(u);
    }
    return Array.from(map.values());
  }

  const sc = STATUS_STYLE[project.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
  const isApproved = project.status === "ACTIVE" && !!project.bodApprovedAt;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/projects" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Projects / Sites</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{project.name}</h1>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: sc.bg, color: sc.color }}>
                {project.status}
              </span>
              {project.bodApprovedAt && (
                <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600 }}>
                  ✓ BOD Approved {new Date(project.bodApprovedAt).toLocaleDateString("en-PH")}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {!isApproved && <ApproveProjectButton projectId={id} />}
            <EditProjectForm project={{
              id: project.id,
              name: project.name,
              status: project.status,
              startDate: project.startDate,
              endDate: project.endDate,
              contractValue: project.contractValue,
              developerAdvance: project.developerAdvance,
              targetUnitsPerMonth: project.targetUnitsPerMonth,
              minOperatingCashBuffer: project.minOperatingCashBuffer,
            }} />
            <a href={`/construction/ntp`} style={{
              padding: "0.5rem 1rem", borderRadius: "6px", background: "#057a55",
              color: "#fff", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
            }}>NTP Register →</a>
          </div>
        </div>

        {/* BOD Gate Banner */}
        {!isApproved && (
          <div style={{ padding: "0.85rem 1rem", background: "#fef9c3", border: "1px solid #fde047", borderRadius: "6px", fontSize: "0.875rem", color: "#713f12", marginBottom: "1.5rem" }}>
            <strong>BOD Gate:</strong> NTPs cannot be issued until BOD approves this project. Click &ldquo;BOD Approve&rdquo; to activate.
          </div>
        )}

        {/* Key metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Contract Value",     value: php(project.contractValue) },
            { label: "Developer Advance",  value: php(project.developerAdvance) },
            { label: "Advance Recovered",  value: php(project.advanceRecovered) },
            { label: "Target Units/Month", value: String(project.targetUnitsPerMonth) },
            { label: "Min. Cash Buffer",   value: php(project.minOperatingCashBuffer) },
            { label: "Total Units",        value: String(unitRows.length) },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1rem 1.25rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.25rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Project Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}><div style={LABEL}>Developer</div>
              {project.devId
                ? <a href={`/master-list/developers/${project.devId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{project.devName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}><div style={LABEL}>Start Date</div><div style={VALUE}>{project.startDate ?? "—"}</div></div>
            <div style={FIELD}><div style={LABEL}>End Date</div><div style={VALUE}>{project.endDate ?? "—"}</div></div>
            <div style={FIELD}><div style={LABEL}>Project ID</div><div style={{ ...VALUE, fontFamily: "monospace", fontSize: "0.78rem" }}>{project.id}</div></div>
            <div style={FIELD}><div style={LABEL}>Created</div><div style={VALUE}>{new Date(project.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div></div>
          </div>
        </div>

        {/* Unit Models */}
        <UnitModelManager projectId={id} models={unitModelRows} />

        {/* Blocks & Units */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#374151" }}>Blocks & Units ({unitRows.length} units)</h2>
            <AddBlockForm projectId={id} />
          </div>

          {blockRows.length === 0 ? (
            <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
              No blocks yet. Add a block first, then add units.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {blockRows.map((block) => {
                const blockUnits = unitRows.filter((u) => u.blockId === block.id);
                const modelGroups = groupUnitsByModel(blockUnits);
                return (
                  <details key={block.id} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }} open>
                    <summary style={{ cursor: "pointer", listStyle: "none", padding: "0.75rem 1rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <div>
                        <span style={{ fontWeight: 700, color: "#111827", fontSize: "0.9rem" }}>{block.blockName}</span>
                        <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#6b7280" }}>{blockUnits.length}/{block.totalLots} lots</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                        <EditBlockForm blockId={block.id} initialName={block.blockName} initialLots={block.totalLots} />
                        <DeleteBlockButton blockId={block.id} />
                      </div>
                    </summary>

                    {modelGroups.map((mg) => (
                      <details key={mg.unitModel} style={{ borderTop: "1px solid #f3f4f6" }} open>
                        <summary style={{ cursor: "pointer", listStyle: "none", padding: "0.55rem 1.1rem 0.55rem 1.85rem", background: "#fff", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.82rem", color: "#111827" }}>
                          🏠 {mg.unitModel}
                          <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "#9ca3af" }}>{mg.units.length} unit{mg.units.length !== 1 ? "s" : ""}</span>
                        </summary>
                        <div style={{ paddingLeft: "0.95rem" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                            <thead>
                              <tr>
                                {["Lot #", "Unit Code", "Model", "Type", "Status", ""].map((h, i) => (
                                  <th key={i} style={{ padding: "0.5rem 0.9rem", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #f3f4f6", fontSize: "0.78rem" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {mg.units.map((u) => (
                                <UnitRow
                                  key={u.id}
                                  unit={{ id: u.id, blockId: u.blockId ?? "", lotNumber: u.lotNumber, unitCode: u.unitCode, unitModel: u.unitModel, unitType: u.unitType ?? "MID", status: u.status, contractPrice: u.contractPrice }}
                                  blockOptions={blockRows.map((b) => ({ id: b.id, blockName: b.blockName }))}
                                  unitModelOptions={unitModelNames}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    ))}

                    <div style={{ padding: "0.75rem 1rem", borderTop: blockUnits.length > 0 ? "1px solid #f3f4f6" : undefined }}>
                      <AddUnitForm projectId={id} blockOptions={blockRows.map((b) => ({ id: b.id, blockName: b.blockName }))} unitModelOptions={unitModelNames} />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>

        {/* Material BOM */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#374151" }}>Material BOM ({materialBomRows.length} lines)</h2>
            <a href="/planning/bom" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>BOM Register →</a>
          </div>
          {materialBomRows.length === 0 ? (
            <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
              No material BOM entries for this project yet. Add them in the{" "}
              <a href="/planning/bom/new" style={{ color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>BOM Register</a>.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {Array.from(bomModelMap.values()).map((modelGroup) => (
                <details key={modelGroup.unitModel} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }} open>
                  <summary style={bomSummaryStyle(0)}>
                    🏠 Model: {modelGroup.unitModel}
                  </summary>

                  {Array.from(modelGroup.unitTypes.values()).map((utGroup) => (
                    <details key={utGroup.unitType} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <summary style={bomSummaryStyle(1)}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                          {utGroup.unitType}
                        </span>
                        <span style={{ fontWeight: 500, color: "#374151" }}>Unit Type</span>
                      </summary>

                      {Array.from(utGroup.categories.values()).map((catGroup) => (
                        <details key={catGroup.categoryName} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <summary style={bomSummaryStyle(2)}>
                            📂 {catGroup.categoryName}
                          </summary>

                          {Array.from(catGroup.scopes.values()).map((sg) => (
                            <details key={sg.scopeKey} style={{ borderTop: "1px solid #f9fafb" }} open>
                              <summary style={bomSummaryStyle(3)}>
                                {sg.scopeCode ? (
                                  <span style={{ fontFamily: "monospace", background: "#f3f4f6", color: "#374151", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700 }}>
                                    {sg.scopeCode}
                                  </span>
                                ) : null}
                                <span style={{ fontWeight: 500, color: "#374151" }}>{sg.scopeName ?? "Unscoped"}</span>
                                {sg.activityCode && (
                                  <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>· Activity [{sg.activityCode}] {sg.activityName}</span>
                                )}
                              </summary>

                              <div style={{ padding: "0.5rem 1.1rem 0.85rem 3.35rem", overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                                  <thead>
                                    <tr>
                                      {["Material", "Unit", "Qty / Unit", "Equipment Type", "Status"].map((h) => (
                                        <th key={h} style={{ padding: "0.45rem 1rem 0.45rem 0", textAlign: "left", fontWeight: 600, color: "#9ca3af", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sg.lines.map((r) => {
                                      const bb = BOM_STATUS_BADGE[r.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                                      return (
                                        <tr key={r.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                                          <td style={{ padding: "0.5rem 1rem 0.5rem 0", color: "#111827", fontWeight: 600 }}>
                                            {r.matCode && <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#6b7280", marginRight: "0.3rem" }}>{r.matCode}</span>}
                                            {r.matName ?? "—"}
                                          </td>
                                          <td style={{ padding: "0.5rem 1rem 0.5rem 0", color: "#6b7280", fontSize: "0.82rem" }}>{r.matUnit ?? "—"}</td>
                                          <td style={{ padding: "0.5rem 1rem 0.5rem 0", fontFamily: "monospace", fontWeight: 600, color: "#374151" }}>
                                            {Number(r.quantityPerUnit).toFixed(4)}
                                          </td>
                                          <td style={{ padding: "0.5rem 1rem 0.5rem 0", color: "#6b7280", fontSize: "0.82rem" }}>{r.equipmentType ?? <span style={{ color: "#d1d5db" }}>—</span>}</td>
                                          <td style={{ padding: "0.5rem 1rem 0.5rem 0" }}>
                                            <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: bb.bg, color: bb.color }}>
                                              {r.status.replace("_", " ")}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </details>
                          ))}
                        </details>
                      ))}
                    </details>
                  ))}
                </details>
              ))}
            </div>
          )}
        </div>

        {/* Bill of Quantities — Developer Rate Cards */}
        <DevRateCards
          title="Bill of Quantities (BOQ)"
          devProjects={[{ id: project.id, name: project.name }]}
          rateCards={devRateCards}
          deductions={devDeductions}
          phaseCategories={phaseCategoryList}
          phaseScopes={phaseScopeList}
          phaseActivities={phaseActivityList}
          unitModelOptions={devUnitModelOptions}
          isAdmin={isAdmin}
        />

        {/* Labor BOM — Subcontractor Rate Cards */}
        <SubconRateCards
          title="Labor BOM"
          rateCards={subconRateCards}
          deductions={subconDeductions}
          projects={[{ id: project.id, name: project.name }]}
          phaseCategories={phaseCategoryList}
          phaseScopes={phaseScopeList}
          phaseActivities={phaseActivityList}
          unitModelOptions={subconUnitModelOptions}
          isAdmin={isAdmin}
        />
      </div>
    </main>
  );
}
