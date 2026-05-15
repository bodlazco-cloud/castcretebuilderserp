export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/db";
import { masterBomEntries, activityDefinitions, projects, materials } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { BomSubmitActions, BomReviewActions } from "./BomApprovalActions";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function BomStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT:          { label: "Draft",          color: "bg-slate-700 text-slate-300" },
    PENDING_REVIEW: { label: "Pending Review", color: "bg-yellow-900/70 text-yellow-300" },
    APPROVED:       { label: "Approved",       color: "bg-green-900/70 text-green-300" },
    REJECTED:       { label: "Rejected",       color: "bg-red-900/70 text-red-300" },
  };
  const s = map[status] ?? { label: status, color: "bg-slate-700 text-slate-300" };
  return <Badge label={s.label} color={s.color} />;
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
  activityDefId: string | null;
  activityCode: string | null;
  activityName: string | null;
  scopeCode: string | null;
  scopeName: string | null;
  projId: string | null;
  projName: string | null;
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
        activityDefId:   activityDefinitions.id,
        activityCode:    activityDefinitions.activityCode,
        activityName:    activityDefinitions.activityName,
        scopeCode:       activityDefinitions.scopeCode,
        scopeName:       activityDefinitions.scopeName,
        projId:          projects.id,
        projName:        projects.name,
        matCode:         materials.code,
        matName:         materials.name,
        matUnit:         materials.unit,
      })
      .from(masterBomEntries)
      .leftJoin(activityDefinitions, eq(masterBomEntries.activityDefId, activityDefinitions.id))
      .leftJoin(projects, eq(activityDefinitions.projectId, projects.id))
      .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
      .where(eq(masterBomEntries.isActive, true))
      .orderBy(projects.name, activityDefinitions.scopeCode, activityDefinitions.activityCode, masterBomEntries.unitModel, desc(masterBomEntries.createdAt)),
    [] as BomRow[],
  );

  const displayed = filterStatus ? rows.filter((r) => r.status === filterStatus) : rows;

  type UnitGroup = { unitModel: string; unitType: string; lines: BomRow[] };
  type ActivityGroup = {
    activityDefId: string;
    activityCode: string;
    activityName: string;
    unitGroups: Map<string, UnitGroup>;
  };
  type ScopeGroup = {
    scopeCode: string;
    scopeName: string;
    activities: Map<string, ActivityGroup>;
  };
  type ProjectGroup = {
    projId: string;
    projName: string;
    scopes: Map<string, ScopeGroup>;
  };

  const projectMap = new Map<string, ProjectGroup>();

  for (const row of displayed) {
    const pid = row.projId ?? "unknown";
    if (!projectMap.has(pid)) {
      projectMap.set(pid, { projId: pid, projName: row.projName ?? "Unknown Project", scopes: new Map() });
    }
    const proj = projectMap.get(pid)!;

    const sc = row.scopeCode ?? "unknown";
    if (!proj.scopes.has(sc)) {
      proj.scopes.set(sc, { scopeCode: sc, scopeName: row.scopeName ?? sc, activities: new Map() });
    }
    const scope = proj.scopes.get(sc)!;

    const aid = row.activityDefId ?? "unknown";
    if (!scope.activities.has(aid)) {
      scope.activities.set(aid, {
        activityDefId: aid,
        activityCode:  row.activityCode ?? "",
        activityName:  row.activityName ?? "",
        unitGroups:    new Map(),
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

  return (
    <main className="min-h-screen bg-slate-950 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-5">

        <div>
          <p className="text-xs text-slate-400 mb-1">
            <a href="/planning" className="hover:text-white transition-colors">← Planning &amp; Engineering</a>
          </p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white">Master BOM Register</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {totalCount} active line{totalCount !== 1 ? "s" : ""}
                {approvedCount > 0 && <span className="ml-2 text-green-400">· {approvedCount} approved</span>}
                {pendingCount  > 0 && <span className="ml-2 text-yellow-400">· {pendingCount} pending review</span>}
                {draftCount    > 0 && <span className="ml-2 text-slate-400">· {draftCount} draft</span>}
                {rejectedCount > 0 && <span className="ml-2 text-red-400">· {rejectedCount} rejected</span>}
              </p>
            </div>
            <Link
              href="/planning/bom/new"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              + New Entry
            </Link>
          </div>
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value ? `/planning/bom?status=${f.value}` : "/planning/bom"}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filterStatus === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }`}>
              {f.label}
              <span className="ml-1.5 opacity-70">{f.count}</span>
            </Link>
          ))}
        </div>

        <div className="bg-blue-900/30 border border-blue-800/60 rounded-lg px-4 py-3 text-xs text-blue-300">
          <strong className="text-blue-200">Approval workflow:</strong> DRAFT entries are submitted for Planning review, then approved or rejected by Admin / BOD.
          Approved lines trigger resource forecast generation on NTP issuance. Changes to approved lines require a{" "}
          <a href="/planning/variance-requests/new" className="underline hover:text-white">Variance Request</a>.
        </div>

        {projectMap.size === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
            <p className="text-slate-400 text-sm mb-2">
              {filterStatus ? `No BOM entries with status "${filterStatus}".` : "No active BOM entries found."}
            </p>
            <Link href="/planning/bom/new" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              Add first entry →
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(projectMap.values()).map((proj) => (
              <div key={proj.projId} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">

                <div className="px-5 py-3 bg-slate-900 border-b border-slate-700 flex items-center gap-3">
                  <span className="font-bold text-white">{proj.projName}</span>
                  <span className="text-xs text-slate-500">
                    {Array.from(proj.scopes.values()).reduce(
                      (sum, sc) =>
                        sum + Array.from(sc.activities.values()).reduce(
                          (s2, act) => s2 + Array.from(act.unitGroups.values()).reduce((s3, ug) => s3 + ug.lines.length, 0),
                          0,
                        ),
                      0,
                    )}{" "}
                    lines across {proj.scopes.size} scope{proj.scopes.size !== 1 ? "s" : ""}
                  </span>
                </div>

                {Array.from(proj.scopes.values()).map((scope) => (
                  <div key={scope.scopeCode}>
                    <div className="px-5 py-2 bg-slate-700/40 border-b border-slate-600/40 flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-200 bg-slate-600 px-2 py-0.5 rounded">
                        {scope.scopeCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                        {scope.scopeName}
                      </span>
                    </div>

                    {Array.from(scope.activities.values()).map((act) => (
                      <div key={act.activityDefId} className="border-b border-slate-700/40 last:border-0">
                        <div className="px-5 py-2 bg-slate-800/60 border-b border-slate-700/20 flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-indigo-300 bg-indigo-900/40 px-2 py-0.5 rounded">
                            {act.activityCode}
                          </span>
                          <span className="text-xs text-slate-300 font-medium">{act.activityName}</span>
                        </div>

                        {Array.from(act.unitGroups.values()).map((ug) => {
                          const draftIds = ug.lines
                            .filter((l) => l.status === "DRAFT")
                            .map((l) => l.id);

                          return (
                            <div key={`${ug.unitModel}::${ug.unitType}`} className="px-5 py-3 border-b border-slate-700/10 last:border-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-white">{ug.unitModel}</span>
                                <span className="text-xs font-semibold text-indigo-300 bg-indigo-900/40 px-1.5 py-0.5 rounded">
                                  {ug.unitType}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {ug.lines.length} material line{ug.lines.length !== 1 ? "s" : ""}
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-700/50">
                                      {["Material", "Unit", "Qty / Unit", "Equipment Type", "Ver.", "Status", "Actions"].map((h) => (
                                        <th key={h} className="pb-1.5 text-left font-semibold text-slate-500 uppercase tracking-wide pr-4 whitespace-nowrap">
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-700/10">
                                    {ug.lines.map((line) => (
                                      <tr key={line.id} className={`hover:bg-slate-700/10 ${line.status === "REJECTED" ? "opacity-50" : ""}`}>
                                        <td className="py-1.5 pr-4 text-white font-medium">
                                          {line.matCode && (
                                            <span className="font-mono text-slate-400 mr-1.5">{line.matCode}</span>
                                          )}
                                          {line.matName ?? <span className="text-slate-500">—</span>}
                                        </td>
                                        <td className="py-1.5 pr-4 text-slate-400">{line.matUnit ?? "—"}</td>
                                        <td className="py-1.5 pr-4 font-mono text-slate-200 font-semibold">
                                          {Number(line.quantityPerUnit).toFixed(4)}
                                        </td>
                                        <td className="py-1.5 pr-4 text-slate-400">
                                          {line.equipmentType ?? <span className="text-slate-600">—</span>}
                                        </td>
                                        <td className="py-1.5 pr-4 text-slate-500 font-mono">v{line.version}</td>
                                        <td className="py-1.5 pr-4">
                                          <BomStatusBadge status={line.status} />
                                        </td>
                                        <td className="py-1.5">
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
                                <div className="mt-2">
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
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
