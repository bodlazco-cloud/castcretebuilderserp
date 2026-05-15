export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  masterBomEntries,
  resourceForecasts,
  planningVarianceRequests,
  activityDefinitions,
  materials,
  projects,
  projectUnits,
} from "@/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";

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
    DRAFT:          { label: "Draft",          color: "bg-gray-100 text-gray-600" },
    PENDING_REVIEW: { label: "Pending Review", color: "bg-yellow-100 text-yellow-700" },
    APPROVED:       { label: "Approved",       color: "bg-green-100 text-green-700" },
    REJECTED:       { label: "Rejected",       color: "bg-red-100 text-red-700" },
  };
  const s = map[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
  return <Badge label={s.label} color={s.color} />;
}

export default async function PlanningOverviewPage() {
  const [
    bomByStatus,
    forecastByType,
    forecastByStatus,
    varianceByStatus,
    recentBomEntries,
    projectList,
    unitCount,
  ] = await Promise.all([
    safe(
      db
        .select({ status: masterBomEntries.status, cnt: count() })
        .from(masterBomEntries)
        .where(eq(masterBomEntries.isActive, true))
        .groupBy(masterBomEntries.status),
      [] as { status: string; cnt: number }[],
    ),
    safe(
      db
        .select({ forecastType: resourceForecasts.forecastType, cnt: count() })
        .from(resourceForecasts)
        .groupBy(resourceForecasts.forecastType),
      [] as { forecastType: string; cnt: number }[],
    ),
    safe(
      db
        .select({ status: resourceForecasts.status, cnt: count() })
        .from(resourceForecasts)
        .groupBy(resourceForecasts.status),
      [] as { status: string; cnt: number }[],
    ),
    safe(
      db
        .select({ status: planningVarianceRequests.status, cnt: count() })
        .from(planningVarianceRequests)
        .groupBy(planningVarianceRequests.status),
      [] as { status: string; cnt: number }[],
    ),
    safe(
      db
        .select({
          id:              masterBomEntries.id,
          unitModel:       masterBomEntries.unitModel,
          unitType:        masterBomEntries.unitType,
          status:          masterBomEntries.status,
          quantityPerUnit: masterBomEntries.quantityPerUnit,
          createdAt:       masterBomEntries.createdAt,
          matName:         materials.name,
          matUnit:         materials.unit,
          actName:         activityDefinitions.activityName,
          actCode:         activityDefinitions.activityCode,
        })
        .from(masterBomEntries)
        .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
        .leftJoin(activityDefinitions, eq(masterBomEntries.activityDefId, activityDefinitions.id))
        .where(eq(masterBomEntries.isActive, true))
        .orderBy(desc(masterBomEntries.createdAt))
        .limit(5),
      [] as {
        id: string; unitModel: string; unitType: string; status: string;
        quantityPerUnit: string; createdAt: Date; matName: string | null;
        matUnit: string | null; actName: string | null; actCode: string | null;
      }[],
    ),
    safe(
      db
        .select({ id: projects.id, name: projects.name, status: projects.status })
        .from(projects)
        .orderBy(projects.name),
      [] as { id: string; name: string; status: string }[],
    ),
    safe(
      db
        .select({ cnt: count() })
        .from(resourceForecasts)
        .groupBy(resourceForecasts.forecastType)
        .then((rows) => rows.reduce((sum, r) => sum + Number(r.cnt), 0)),
      0,
    ),
  ]);

  const bomStatusMap = Object.fromEntries(bomByStatus.map((r) => [r.status, Number(r.cnt)]));
  const forecastTypeMap = Object.fromEntries(forecastByType.map((r) => [r.forecastType, Number(r.cnt)]));
  const forecastStatusMap = Object.fromEntries(forecastByStatus.map((r) => [r.status, Number(r.cnt)]));
  const varianceStatusMap = Object.fromEntries(varianceByStatus.map((r) => [r.status, Number(r.cnt)]));

  const approvedBom   = bomStatusMap["APPROVED"]       ?? 0;
  const pendingBom    = bomStatusMap["PENDING_REVIEW"]  ?? 0;
  const draftBom      = bomStatusMap["DRAFT"]           ?? 0;
  const rejectedBom   = bomStatusMap["REJECTED"]        ?? 0;
  const totalBomLines = approvedBom + pendingBom + draftBom + rejectedBom;

  const mrpQueue      = forecastTypeMap["MATERIAL"]   ?? 0;
  const concreteQueue = forecastTypeMap["CONCRETE"]   ?? 0;
  const equipQueue    = forecastTypeMap["EQUIPMENT"]  ?? 0;

  const pendingPr     = forecastStatusMap["PENDING_PR"]  ?? 0;
  const prCreated     = forecastStatusMap["PR_CREATED"]  ?? 0;
  const poIssued      = forecastStatusMap["PO_ISSUED"]   ?? 0;
  const issued        = forecastStatusMap["ISSUED"]      ?? 0;
  const totalForecast = pendingPr + prCreated + poIssued + issued;

  const pendingVariances  = varianceStatusMap["PENDING_REVIEW"] ?? 0;
  const approvedVariances = varianceStatusMap["APPROVED"]       ?? 0;
  const draftVariances    = varianceStatusMap["DRAFT"]          ?? 0;
  const totalVariances    = Object.values(varianceStatusMap).reduce((s, v) => s + v, 0);

  const kpis = [
    {
      label:    "Approved BOM Lines",
      value:    approvedBom,
      sub:      `${totalBomLines} total active`,
      accent:   "border-green-500",
      textColor: "text-green-700",
    },
    {
      label:    "MRP Queue Items",
      value:    mrpQueue,
      sub:      `${pendingPr} pending PR`,
      accent:   "border-blue-500",
      textColor: "text-blue-700",
    },
    {
      label:    "Pending Variances",
      value:    pendingVariances,
      sub:      `${totalVariances} total requests`,
      accent:   "border-yellow-500",
      textColor: "text-yellow-700",
    },
    {
      label:    "Units Forecasted",
      value:    unitCount,
      sub:      `${concreteQueue} concrete · ${equipQueue} equip`,
      accent:   "border-purple-500",
      textColor: "text-purple-700",
    },
  ];

  const forecastPipelineTotal = Math.max(totalForecast, 1);
  const pipelineStages = [
    { label: "Pending PR",  count: pendingPr, pct: Math.round((pendingPr / forecastPipelineTotal) * 100), color: "bg-red-400" },
    { label: "PR Created",  count: prCreated, pct: Math.round((prCreated / forecastPipelineTotal) * 100), color: "bg-yellow-400" },
    { label: "PO Issued",   count: poIssued,  pct: Math.round((poIssued  / forecastPipelineTotal) * 100), color: "bg-blue-400" },
    { label: "Issued",      count: issued,    pct: Math.round((issued    / forecastPipelineTotal) * 100), color: "bg-green-400" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-slate-400 mb-1">
              <a href="/main-dashboard" className="hover:text-white transition-colors">← Dashboard</a>
            </p>
            <h1 className="text-2xl font-bold text-white">Planning &amp; Engineering</h1>
            <p className="text-sm text-slate-400 mt-0.5">Master BOM, Resource Forecasts &amp; Variance Tracking</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href="/planning/bom/new"
              className="px-4 py-2 rounded-lg border border-blue-500 text-blue-400 text-sm font-semibold hover:bg-blue-500 hover:text-white transition-colors">
              + BOM Entry
            </a>
            <a href="/planning/variance-requests/new"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              + Variance Request
            </a>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label}
              className={`bg-slate-800 rounded-xl p-5 border-t-4 ${kpi.accent} border border-slate-700`}>
              <div className={`text-3xl font-extrabold ${kpi.textColor} leading-none`}>
                {kpi.value.toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-white mt-2">{kpi.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* BOM Status + Forecast Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* BOM Status Breakdown */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">BOM Status Breakdown</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Draft",          count: draftBom,    bg: "bg-slate-700",    text: "text-slate-200" },
                { label: "Pending Review", count: pendingBom,  bg: "bg-yellow-900/60", text: "text-yellow-300" },
                { label: "Approved",       count: approvedBom, bg: "bg-green-900/60",  text: "text-green-300" },
                { label: "Rejected",       count: rejectedBom, bg: "bg-red-900/60",    text: "text-red-300"   },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-lg p-4`}>
                  <div className={`text-2xl font-extrabold ${s.text} leading-none`}>
                    {s.count.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
              <span>{totalBomLines} active BOM lines</span>
              <a href="/planning/bom" className="text-blue-400 hover:text-blue-300 font-medium">View register →</a>
            </div>
          </div>

          {/* Forecast Pipeline */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">Resource Forecast Pipeline</h2>
            <div className="space-y-3">
              {pipelineStages.map((stage) => (
                <div key={stage.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{stage.label}</span>
                    <span className="text-slate-400 font-mono">{stage.count} · {stage.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-full transition-all`}
                      style={{ width: `${stage.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400">
              {totalForecast} total forecast lines across all projects
            </div>
          </div>
        </div>

        {/* MRP / Concrete / Equipment Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title:  "Material Requirements (MRP)",
              count:  mrpQueue,
              stat:   `${pendingPr} pending procurement`,
              link:   "/planning/mrp-queue",
              linkLabel: "Open MRP Queue →",
              accent: "border-blue-500",
              iconBg: "bg-blue-900/40",
              icon:   "📦",
            },
            {
              title:  "Concrete Forecast",
              count:  concreteQueue,
              stat:   `Batching schedule lines`,
              link:   "/planning/batching-forecast",
              linkLabel: "View Batching →",
              accent: "border-orange-500",
              iconBg: "bg-orange-900/40",
              icon:   "🏗",
            },
            {
              title:  "Equipment Needs",
              count:  equipQueue,
              stat:   `Motorpool demand lines`,
              link:   "/planning/motorpool-needs",
              linkLabel: "View Motorpool →",
              accent: "border-purple-500",
              iconBg: "bg-purple-900/40",
              icon:   "🚛",
            },
          ].map((card) => (
            <div key={card.title}
              className={`bg-slate-800 rounded-xl border border-slate-700 border-t-4 ${card.accent} p-5`}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`${card.iconBg} w-9 h-9 rounded-lg flex items-center justify-center text-lg`}>
                  {card.icon}
                </span>
                <span className="text-sm font-semibold text-slate-300">{card.title}</span>
              </div>
              <div className="text-4xl font-extrabold text-white leading-none">{card.count.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">{card.stat}</div>
              <a href={card.link} className="mt-4 inline-block text-xs font-semibold text-blue-400 hover:text-blue-300">
                {card.linkLabel}
              </a>
            </div>
          ))}
        </div>

        {/* Variance Summary */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">Variance Request Summary</h2>
            <div className="flex gap-2">
              <a href="/planning/variance-requests"
                className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded border border-slate-600 hover:border-slate-400 transition-colors">
                View All →
              </a>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Draft",          count: draftVariances,    color: "bg-slate-700 text-slate-300" },
              { label: "Pending Review", count: pendingVariances,  color: "bg-yellow-900/60 text-yellow-300" },
              { label: "Approved",       count: approvedVariances, color: "bg-green-900/60 text-green-300" },
              { label: "Total",          count: totalVariances,    color: "bg-slate-600 text-slate-200" },
            ].map((s) => (
              <div key={s.label} className={`${s.color} rounded-lg px-4 py-3 min-w-[100px]`}>
                <div className="text-xl font-bold leading-none">{s.count}</div>
                <div className="text-xs mt-1 opacity-75">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent BOM Entries */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">Recent BOM Entries</h2>
            <a href="/planning/bom" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
              View all →
            </a>
          </div>
          {recentBomEntries.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No BOM entries yet.{" "}
              <a href="/planning/bom/new" className="text-blue-400 hover:text-blue-300">Add first entry →</a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    {["Material", "Activity", "Unit Model / Type", "Qty / Unit", "Status", "Created"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {recentBomEntries.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">
                        {row.matName ?? <span className="text-slate-500">—</span>}
                        {row.matUnit && (
                          <span className="text-slate-400 text-xs ml-1">({row.matUnit})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">
                        {row.actCode && (
                          <span className="font-mono bg-slate-700 px-1.5 py-0.5 rounded text-slate-200 mr-1">
                            {row.actCode}
                          </span>
                        )}
                        {row.actName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white">{row.unitModel}</span>
                        <span className="ml-2 text-xs font-semibold text-indigo-300 bg-indigo-900/40 px-1.5 py-0.5 rounded">
                          {row.unitType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300 text-xs">
                        {Number(row.quantityPerUnit).toFixed(4)}
                      </td>
                      <td className="px-4 py-3">
                        <BomStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleDateString("en-PH", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Project Quick Links */}
        {projectList.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Active Projects</h2>
            <div className="flex flex-wrap gap-2">
              {projectList
                .filter((p) => p.status === "ACTIVE")
                .map((p) => (
                  <span key={p.id}
                    className="px-3 py-1.5 bg-slate-700 rounded-lg text-xs text-slate-200 font-medium">
                    {p.name}
                  </span>
                ))}
              {projectList.filter((p) => p.status === "ACTIVE").length === 0 && (
                <span className="text-slate-500 text-xs">No active projects.</span>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
