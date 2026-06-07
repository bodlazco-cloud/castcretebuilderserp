export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/db";
import { masterBomEntries, materials, projects } from "@/db/schema";
import { phaseActivities, phaseScopes } from "@/db/schema/phases";
import { eq, desc } from "drizzle-orm";
import { BomSubmitActions, BomReviewActions, BomWithdrawAction, BomAddMaterialAction, BomDeleteLineAction } from "./BomApprovalActions";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:          { bg: "#f3f4f6", color: "#6b7280",  label: "Draft" },
  PENDING_REVIEW: { bg: "#fef9c3", color: "#713f12",  label: "Pending Review" },
  APPROVED:       { bg: "#dcfce7", color: "#166534",  label: "Approved" },
  REJECTED:       { bg: "#fef2f2", color: "#b91c1c",  label: "Rejected" },
};

function BomStatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { bg: "#f3f4f6", color: "#6b7280", label: status };
  return (
    <span style={{
      display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px",
      fontSize: "0.72rem", fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

type BomRow = {
  id: string;
  projectId: string;
  projectName: string | null;
  unitModel: string;
  unitType: string;
  quantityPerUnit: string;
  version: number;
  isActive: boolean;
  status: string;
  createdAt: Date;
  activityDefId: string | null;
  equipmentType: string | null;
  phaseActivityId: string | null;
  activityCode: string | null;
  activityName: string | null;
  scopeId: string | null;
  scopeCode: string | null;
  scopeName: string | null;
  matCode: string | null;
  matName: string | null;
  matUnit: string | null;
};

export default async function BomRegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filterStatus = typeof sp.status === "string" ? sp.status : "";

  const rows = await safe(
    db
      .select({
        id:              masterBomEntries.id,
        projectId:       masterBomEntries.projectId,
        projectName:     projects.name,
        unitModel:       masterBomEntries.unitModel,
        unitType:        masterBomEntries.unitType,
        quantityPerUnit: masterBomEntries.quantityPerUnit,
        version:         masterBomEntries.version,
        isActive:        masterBomEntries.isActive,
        status:          masterBomEntries.status,
        createdAt:       masterBomEntries.createdAt,
        activityDefId:   masterBomEntries.activityDefId,
        equipmentType:   masterBomEntries.equipmentType,
        phaseActivityId: phaseActivities.id,
        activityCode:    phaseActivities.code,
        activityName:    phaseActivities.name,
        scopeId:         phaseScopes.id,
        scopeCode:       phaseScopes.code,
        scopeName:       phaseScopes.name,
        matCode:         materials.code,
        matName:         materials.name,
        matUnit:         materials.unit,
      })
      .from(masterBomEntries)
      .leftJoin(projects, eq(masterBomEntries.projectId, projects.id))
      .leftJoin(phaseScopes, eq(masterBomEntries.phaseScopeId, phaseScopes.id))
      .leftJoin(phaseActivities, eq(masterBomEntries.phaseActivityId, phaseActivities.id))
      .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
      .where(eq(masterBomEntries.isActive, true))
      .orderBy(projects.name, masterBomEntries.unitModel, masterBomEntries.unitType, phaseScopes.code, desc(masterBomEntries.createdAt)),
    [] as BomRow[],
  );

  const materialRows = await safe(
    db
      .select({
        id:         materials.id,
        code:       materials.code,
        name:       materials.name,
        unit:       materials.unit,
        adminPrice: materials.adminPrice,
      })
      .from(materials)
      .where(eq(materials.isActive, true))
      .orderBy(materials.code),
    [] as { id: string; code: string; name: string; unit: string; adminPrice: string | null }[],
  );

  const displayed = filterStatus ? rows.filter((r) => r.status === filterStatus) : rows;

  // Site → Model Type → Unit Type → Scope of Work → Materials
  type ScopeGroup = { scopeKey: string; scopeCode: string | null; scopeName: string | null; lines: BomRow[] };
  type UnitTypeGroup = { unitType: string; scopes: Map<string, ScopeGroup> };
  type ModelGroup = { unitModel: string; unitTypes: Map<string, UnitTypeGroup> };
  type SiteGroup = { projectId: string; projectName: string; models: Map<string, ModelGroup> };

  const siteMap = new Map<string, SiteGroup>();

  for (const row of displayed) {
    const siteKey = row.projectId;
    if (!siteMap.has(siteKey)) {
      siteMap.set(siteKey, { projectId: row.projectId, projectName: row.projectName ?? "Unassigned", models: new Map() });
    }
    const site = siteMap.get(siteKey)!;

    if (!site.models.has(row.unitModel)) {
      site.models.set(row.unitModel, { unitModel: row.unitModel, unitTypes: new Map() });
    }
    const model = site.models.get(row.unitModel)!;

    if (!model.unitTypes.has(row.unitType)) {
      model.unitTypes.set(row.unitType, { unitType: row.unitType, scopes: new Map() });
    }
    const unitTypeGroup = model.unitTypes.get(row.unitType)!;

    const scopeKey = row.scopeCode ?? "unscoped";
    if (!unitTypeGroup.scopes.has(scopeKey)) {
      unitTypeGroup.scopes.set(scopeKey, { scopeKey, scopeCode: row.scopeCode, scopeName: row.scopeName, lines: [] });
    }
    unitTypeGroup.scopes.get(scopeKey)!.lines.push(row);
  }

  const totalCount    = rows.length;
  const approvedCount = rows.filter((r) => r.status === "APPROVED").length;
  const pendingCount  = rows.filter((r) => r.status === "PENDING_REVIEW").length;
  const draftCount    = rows.filter((r) => r.status === "DRAFT").length;
  const rejectedCount = rows.filter((r) => r.status === "REJECTED").length;

  const STATUS_FILTERS = [
    { value: "",               label: "All",            count: totalCount },
    { value: "DRAFT",          label: "Draft",          count: draftCount },
    { value: "PENDING_REVIEW", label: "Pending Review", count: pendingCount },
    { value: "APPROVED",       label: "Approved",       count: approvedCount },
    { value: "REJECTED",       label: "Rejected",       count: rejectedCount },
  ];

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  };

  const summaryStyle = (depth: number): React.CSSProperties => ({
    cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: "0.6rem",
    padding: depth === 0 ? "0.85rem 1.25rem" : depth === 1 ? "0.65rem 1.25rem 0.65rem 2rem" : depth === 2 ? "0.55rem 1.25rem 0.55rem 2.75rem" : "0.5rem 1.25rem 0.5rem 3.5rem",
    background: depth === 0 ? "#f9fafb" : depth === 1 ? "#fff" : depth === 2 ? "#fafafa" : "#fcfcfd",
    borderBottom: "1px solid #f3f4f6",
    fontWeight: depth === 0 ? 700 : depth === 1 ? 700 : 600,
    fontSize: depth === 0 ? "0.95rem" : depth === 1 ? "0.85rem" : "0.8rem",
    color: "#111827",
  });

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>
              ← Planning &amp; Engineering
            </a>
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Master BOM Register</h1>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
                {totalCount} active line{totalCount !== 1 ? "s" : ""}
                {approvedCount > 0 && <span style={{ marginLeft: "0.5rem", color: "#166534" }}>· {approvedCount} approved</span>}
                {pendingCount  > 0 && <span style={{ marginLeft: "0.5rem", color: "#713f12" }}>· {pendingCount} pending review</span>}
                {draftCount    > 0 && <span style={{ marginLeft: "0.5rem", color: "#6b7280" }}>· {draftCount} draft</span>}
                {rejectedCount > 0 && <span style={{ marginLeft: "0.5rem", color: "#b91c1c" }}>· {rejectedCount} rejected</span>}
              </p>
            </div>
            <Link
              href="/planning/bom/new"
              style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#1a56db", color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
              + New Entry
            </Link>
          </div>
        </div>

        {/* Status filter chips */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {STATUS_FILTERS.map((f) => {
            const active = filterStatus === f.value;
            return (
              <Link
                key={f.value}
                href={f.value ? `/planning/bom?status=${f.value}` : "/planning/bom"}
                style={{
                  padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600,
                  textDecoration: "none",
                  background: active ? "#1a56db" : "#fff",
                  color: active ? "#fff" : "#374151",
                  border: active ? "1px solid #1a56db" : "1px solid #d1d5db",
                }}>
                {f.label}
                <span style={{ marginLeft: "0.4rem", opacity: 0.7 }}>{f.count}</span>
              </Link>
            );
          })}
        </div>

        {/* Workflow callout */}
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#1e40af", marginBottom: "1.25rem" }}>
          <strong>Approval workflow:</strong> Draft entries (new or edited) are submitted by Planning for Admin / BOD review,
          and may be <strong>withdrawn</strong> back to Draft for further changes before a decision is made.
          Approved lines trigger resource forecast generation on NTP issuance.
        </div>

        {/* BOM — collapsible: Site → Model Type → Unit Type → Scope of Work → Materials */}
        {siteMap.size === 0 ? (
          <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              {filterStatus ? `No BOM entries with status "${filterStatus}".` : "No active BOM entries found."}
            </p>
            <Link href="/planning/bom/new" style={{ color: "#1a56db", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>
              Add first entry →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Array.from(siteMap.values()).map((site) => {
              const siteLineCount = Array.from(site.models.values())
                .flatMap((m) => Array.from(m.unitTypes.values()))
                .flatMap((ut) => Array.from(ut.scopes.values()))
                .reduce((sum, sg) => sum + sg.lines.length, 0);

              return (
                <details key={site.projectId} style={{ ...card, overflow: "hidden" }} open>
                  <summary style={summaryStyle(0)}>
                    <span>📍 {site.projectName}</span>
                    <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "#9ca3af" }}>
                      {siteLineCount} material line{siteLineCount !== 1 ? "s" : ""}
                    </span>
                    <Link href={`/master-list/projects/${site.projectId}`} style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>
                      View Project →
                    </Link>
                  </summary>

                  {Array.from(site.models.values()).map((model) => (
                    <details key={model.unitModel} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <summary style={summaryStyle(1)}>
                        🏠 Model: {model.unitModel}
                      </summary>

                      {Array.from(model.unitTypes.values()).map((ut) => (
                        <details key={ut.unitType} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <summary style={summaryStyle(2)}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                              {ut.unitType}
                            </span>
                            <span style={{ fontWeight: 500, color: "#374151" }}>Unit Type</span>
                          </summary>

                          {Array.from(ut.scopes.values()).map((sg) => {
                            const draftIds = sg.lines.filter((l) => l.status === "DRAFT").map((l) => l.id);
                            const act = sg.lines[0];
                            return (
                              <details key={sg.scopeKey} style={{ borderTop: "1px solid #f9fafb" }} open>
                                <summary style={summaryStyle(3)}>
                                  {sg.scopeCode ? (
                                    <span style={{ fontFamily: "monospace", background: "#f3f4f6", color: "#374151", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700 }}>
                                      {sg.scopeCode}
                                    </span>
                                  ) : null}
                                  <span style={{ fontWeight: 500, color: "#374151" }}>{sg.scopeName ?? "Unscoped"}</span>
                                  {act?.activityCode && (
                                    <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>· Activity [{act.activityCode}] {act.activityName}</span>
                                  )}
                                  {act?.activityDefId && (
                                    <Link href={`/master-list/sow/${act.activityDefId}`} onClick={(e) => e.stopPropagation()} style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>
                                      View SOW item →
                                    </Link>
                                  )}
                                </summary>

                                <div style={{ padding: "0.75rem 1.25rem 1rem 3.5rem" }}>
                                  <div style={{ overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                                      <thead>
                                        <tr>
                                          {["Material", "Unit", "Qty / Unit", "Equipment Type", "Ver.", "Status", "Actions"].map((h) => (
                                            <th key={h} style={{
                                              paddingBottom: "0.4rem", textAlign: "left", fontWeight: 600,
                                              color: "#9ca3af", fontSize: "0.72rem", textTransform: "uppercase",
                                              letterSpacing: "0.05em", paddingRight: "1rem", whiteSpace: "nowrap",
                                              borderBottom: "1px solid #e5e7eb",
                                            }}>
                                              {h}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sg.lines.map((line) => (
                                          <tr key={line.id} style={{ borderBottom: "1px solid #f9fafb", opacity: line.status === "REJECTED" ? 0.7 : 1 }}>
                                            <td style={{ padding: "0.5rem 1rem 0.5rem 0", color: "#111827", fontWeight: 600 }}>
                                              {line.matCode && (
                                                <span style={{ fontFamily: "monospace", color: "#6b7280", marginRight: "0.35rem", fontSize: "0.75rem" }}>{line.matCode}</span>
                                              )}
                                              {line.matName ?? <span style={{ color: "#9ca3af" }}>—</span>}
                                            </td>
                                            <td style={{ padding: "0.5rem 1rem 0.5rem 0", color: "#6b7280", fontSize: "0.82rem" }}>{line.matUnit ?? "—"}</td>
                                            <td style={{ padding: "0.5rem 1rem 0.5rem 0", fontFamily: "monospace", color: "#374151", fontWeight: 600, fontSize: "0.82rem" }}>
                                              {Number(line.quantityPerUnit).toFixed(4)}
                                            </td>
                                            <td style={{ padding: "0.5rem 1rem 0.5rem 0", color: "#6b7280", fontSize: "0.82rem" }}>
                                              {line.equipmentType ?? <span style={{ color: "#d1d5db" }}>—</span>}
                                            </td>
                                            <td style={{ padding: "0.5rem 1rem 0.5rem 0", fontFamily: "monospace", color: "#9ca3af", fontSize: "0.78rem" }}>v{line.version}</td>
                                            <td style={{ padding: "0.5rem 1rem 0.5rem 0" }}>
                                              <BomStatusBadge status={line.status} />
                                              {line.status === "REJECTED" && (
                                                <div style={{ marginTop: "0.2rem", fontSize: "0.7rem", color: "#9ca3af" }}>Edit to resubmit</div>
                                              )}
                                            </td>
                                            <td style={{ padding: "0.5rem 0", whiteSpace: "nowrap" }}>
                                              {(line.status === "DRAFT" || line.status === "REJECTED") && (
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                                                  <Link
                                                    href={`/planning/bom/${line.id}/edit`}
                                                    style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1a56db", textDecoration: "none", padding: "0.2rem 0.55rem", border: "1px solid #bfdbfe", borderRadius: "5px", background: "#eff6ff" }}>
                                                    Edit
                                                  </Link>
                                                  <BomDeleteLineAction id={line.id} />
                                                </span>
                                              )}
                                              {line.status === "PENDING_REVIEW" && (
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                                                  <BomReviewActions id={line.id} />
                                                  <BomWithdrawAction id={line.id} />
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div style={{ marginTop: "0.75rem" }}>
                                    <BomAddMaterialAction
                                      projectId={site.projectId}
                                      phaseScopeId={sg.lines[0]?.scopeId ?? ""}
                                      phaseActivityId={act?.phaseActivityId ?? null}
                                      activityDefId={act?.activityDefId ?? null}
                                      unitModel={model.unitModel}
                                      unitType={ut.unitType}
                                      materials={materialRows}
                                    />
                                  </div>

                                  {draftIds.length > 0 && (
                                    <div style={{ marginTop: "0.5rem" }}>
                                      <BomSubmitActions ids={draftIds} />
                                    </div>
                                  )}
                                </div>
                              </details>
                            );
                          })}
                        </details>
                      ))}
                    </details>
                  ))}
                </details>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
