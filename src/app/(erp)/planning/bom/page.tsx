export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/db";
import { masterBomEntries, materials } from "@/db/schema";
import { phaseActivities, phaseScopes } from "@/db/schema/phases";
import { eq, desc } from "drizzle-orm";
import { BomSubmitActions, BomReviewActions } from "./BomApprovalActions";

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
  unitModel: string;
  unitType: string;
  quantityPerUnit: string;
  version: number;
  isActive: boolean;
  status: string;
  createdAt: Date;
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
        unitModel:       masterBomEntries.unitModel,
        unitType:        masterBomEntries.unitType,
        quantityPerUnit: masterBomEntries.quantityPerUnit,
        version:         masterBomEntries.version,
        isActive:        masterBomEntries.isActive,
        status:          masterBomEntries.status,
        createdAt:       masterBomEntries.createdAt,
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
      .leftJoin(phaseScopes, eq(masterBomEntries.phaseScopeId, phaseScopes.id))
      .leftJoin(phaseActivities, eq(masterBomEntries.phaseActivityId, phaseActivities.id))
      .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
      .where(eq(masterBomEntries.isActive, true))
      .orderBy(phaseScopes.code, phaseActivities.code, masterBomEntries.unitModel, desc(masterBomEntries.createdAt)),
    [] as BomRow[],
  );

  const displayed = filterStatus ? rows.filter((r) => r.status === filterStatus) : rows;

  type UnitGroup = { unitModel: string; unitType: string; lines: BomRow[] };
  type ActivityGroup = {
    phaseActivityId: string | null;
    activityCode: string | null;
    activityName: string | null;
    unitGroups: Map<string, UnitGroup>;
  };
  type ScopeGroup = {
    scopeCode: string;
    scopeName: string;
    activities: Map<string, ActivityGroup>;
  };

  const scopeMap = new Map<string, ScopeGroup>();

  for (const row of displayed) {
    const sc = row.scopeCode ?? "unknown";
    if (!scopeMap.has(sc)) {
      scopeMap.set(sc, { scopeCode: sc, scopeName: row.scopeName ?? sc, activities: new Map() });
    }
    const scope = scopeMap.get(sc)!;

    // Group by activity if present, otherwise use a sentinel key for scope-only entries
    const aid = row.phaseActivityId ?? "__scope_only__";
    if (!scope.activities.has(aid)) {
      scope.activities.set(aid, {
        phaseActivityId: row.phaseActivityId,
        activityCode:    row.activityCode,
        activityName:    row.activityName,
        unitGroups:      new Map(),
      });
    }
    const act = scope.activities.get(aid)!;

    const ugKey = `${row.unitModel}::${row.unitType}`;
    if (!act.unitGroups.has(ugKey)) {
      act.unitGroups.set(ugKey, { unitModel: row.unitModel, unitType: row.unitType, lines: [] });
    }
    act.unitGroups.get(ugKey)!.lines.push(row);
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
          <strong>Approval workflow:</strong> DRAFT entries are submitted for Planning review, then approved or rejected by Admin / BOD.
          Approved lines trigger resource forecast generation on NTP issuance. Changes to approved lines require a{" "}
          <a href="/planning/variance-requests/new" style={{ color: "#1a56db", textDecoration: "underline" }}>Variance Request</a>.
        </div>

        {/* BOM Table */}
        {scopeMap.size === 0 ? (
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
            {Array.from(scopeMap.values()).map((scope) => (
              <div key={scope.scopeCode} style={{ ...card, overflow: "hidden" }}>

                {/* Scope header */}
                <div style={{ padding: "0.75rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontFamily: "monospace", background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.78rem", fontWeight: 700 }}>
                    {scope.scopeCode}
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {scope.scopeName}
                  </span>
                </div>

                {Array.from(scope.activities.values()).map((act) => (
                  <div key={act.phaseActivityId ?? "__scope_only__"} style={{ borderBottom: "1px solid #f3f4f6" }}>

                    {/* Activity sub-header — only shown when an activity is linked */}
                    {act.activityCode && (
                      <div style={{ padding: "0.55rem 1.25rem", background: "#fafafa", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontFamily: "monospace", background: "#f3f4f6", color: "#374151", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
                          {act.activityCode}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 500 }}>{act.activityName}</span>
                      </div>
                    )}

                    {Array.from(act.unitGroups.values()).map((ug) => {
                      const draftIds = ug.lines
                        .filter((l) => l.status === "DRAFT")
                        .map((l) => l.id);

                      return (
                        <div key={`${ug.unitModel}::${ug.unitType}`} style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #f9fafb" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#111827" }}>{ug.unitModel}</span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                              {ug.unitType}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>
                              {ug.lines.length} material line{ug.lines.length !== 1 ? "s" : ""}
                            </span>
                          </div>

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
                                {ug.lines.map((line) => (
                                  <tr key={line.id} style={{ borderBottom: "1px solid #f9fafb", opacity: line.status === "REJECTED" ? 0.5 : 1 }}>
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
                                    </td>
                                    <td style={{ padding: "0.5rem 0", whiteSpace: "nowrap" }}>
                                      {line.status === "DRAFT" && (
                                        <Link
                                          href={`/planning/bom/${line.id}/edit`}
                                          style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1a56db", textDecoration: "none", padding: "0.2rem 0.55rem", border: "1px solid #bfdbfe", borderRadius: "5px", background: "#eff6ff" }}>
                                          Edit
                                        </Link>
                                      )}
                                      {line.status === "PENDING_REVIEW" && (
                                        <BomReviewActions id={line.id} />
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {draftIds.length > 0 && (
                            <div style={{ marginTop: "0.5rem" }}>
                              <BomSubmitActions ids={draftIds} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
