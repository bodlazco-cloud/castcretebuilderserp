export const dynamic = "force-dynamic";

import { db } from "@/db";
import { resourceForecasts, masterBomEntries, materials, projectUnits, projects } from "@/db/schema";
import { eq, count } from "drizzle-orm";

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

function ForecastStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    PENDING_PR: { label: "Pending PR", color: "bg-red-900/70 text-red-300" },
    PR_CREATED: { label: "PR Created", color: "bg-yellow-900/70 text-yellow-300" },
    PO_ISSUED:  { label: "PO Issued",  color: "bg-blue-900/70 text-blue-300" },
    ISSUED:     { label: "Issued",     color: "bg-green-900/70 text-green-300" },
  };
  const s = map[status] ?? { label: status, color: "bg-slate-700 text-slate-300" };
  return <Badge label={s.label} color={s.color} />;
}

type MrpRow = {
  id: string;
  grossQuantity: string;
  quantityConsumed: string;
  status: string;
  purchaseRequisitionId: string | null;
  unitCode: string | null;
  unitModel: string | null;
  unitType: string | null;
  projId: string | null;
  projName: string | null;
  matName: string | null;
  matUnit: string | null;
  matCode: string | null;
};

export default async function MrpQueuePage() {
  const [rows, statusCounts] = await Promise.all([
    safe(
      db
        .select({
          id:                    resourceForecasts.id,
          grossQuantity:         resourceForecasts.grossQuantity,
          quantityConsumed:      resourceForecasts.quantityConsumed,
          status:                resourceForecasts.status,
          purchaseRequisitionId: resourceForecasts.purchaseRequisitionId,
          unitCode:              projectUnits.unitCode,
          unitModel:             projectUnits.unitModel,
          unitType:              projectUnits.unitType,
          projId:                projects.id,
          projName:              projects.name,
          matName:               materials.name,
          matUnit:               materials.unit,
          matCode:               materials.code,
        })
        .from(resourceForecasts)
        .leftJoin(masterBomEntries, eq(resourceForecasts.masterBomEntryId, masterBomEntries.id))
        .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
        .leftJoin(projectUnits, eq(resourceForecasts.unitId, projectUnits.id))
        .leftJoin(projects, eq(resourceForecasts.projectId, projects.id))
        .where(eq(resourceForecasts.forecastType, "MATERIAL"))
        .orderBy(projects.name, projectUnits.unitCode),
      [] as MrpRow[],
    ),
    safe(
      db
        .select({ status: resourceForecasts.status, cnt: count() })
        .from(resourceForecasts)
        .where(eq(resourceForecasts.forecastType, "MATERIAL"))
        .groupBy(resourceForecasts.status),
      [] as { status: string; cnt: number }[],
    ),
  ]);

  const statusMap = Object.fromEntries(statusCounts.map((r) => [r.status, Number(r.cnt)]));
  const pendingPr = statusMap["PENDING_PR"] ?? 0;
  const prCreated = statusMap["PR_CREATED"] ?? 0;
  const poIssued  = statusMap["PO_ISSUED"]  ?? 0;
  const issued    = statusMap["ISSUED"]     ?? 0;

  type ProjectGroup = { projId: string; projName: string; rows: MrpRow[] };
  const projectMap = new Map<string, ProjectGroup>();
  for (const row of rows) {
    const pid = row.projId ?? "unknown";
    if (!projectMap.has(pid)) {
      projectMap.set(pid, { projId: pid, projName: row.projName ?? "Unknown Project", rows: [] });
    }
    projectMap.get(pid)!.rows.push(row);
  }

  const kpis = [
    { label: "Pending PR",  value: pendingPr, color: "border-red-500",    text: "text-red-400" },
    { label: "PR Created",  value: prCreated, color: "border-yellow-500", text: "text-yellow-400" },
    { label: "PO Issued",   value: poIssued,  color: "border-blue-500",   text: "text-blue-400" },
    { label: "Issued",      value: issued,    color: "border-green-500",  text: "text-green-400" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-5">

        <div>
          <p className="text-xs text-slate-400 mb-1">
            <a href="/planning" className="hover:text-white transition-colors">← Planning &amp; Engineering</a>
          </p>
          <h1 className="text-2xl font-bold text-white">MRP Queue — Material Requirements</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Resource forecasts of type MATERIAL generated from approved BOM entries on NTP issuance.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className={`bg-slate-800 rounded-xl border border-slate-700 border-t-4 ${kpi.color} p-5`}>
              <div className={`text-3xl font-extrabold ${kpi.text} leading-none`}>
                {kpi.value.toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-white mt-2">{kpi.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">forecast lines</div>
            </div>
          ))}
        </div>

        {projectMap.size === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
            <p className="text-slate-400 text-sm mb-2">No material forecast lines found.</p>
            <p className="text-slate-500 text-xs">
              Resource forecasts are created automatically when an NTP is issued for a project with approved BOM entries.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(projectMap.values()).map((proj) => {
              const projPending = proj.rows.filter((r) => r.status === "PENDING_PR").length;
              return (
                <div key={proj.projId} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="px-5 py-3 bg-slate-900 border-b border-slate-700 flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-white">{proj.projName}</span>
                    <span className="text-xs text-slate-500">{proj.rows.length} line{proj.rows.length !== 1 ? "s" : ""}</span>
                    {projPending > 0 && (
                      <span className="text-xs bg-red-900/60 text-red-300 px-2 py-0.5 rounded-full font-semibold">
                        {projPending} pending PR
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {["Unit Code", "Model / Type", "Material", "Unit", "Gross Qty", "Consumed", "Remaining", "Status", "PR"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40">
                        {proj.rows.map((row) => {
                          const gross     = Number(row.grossQuantity);
                          const consumed  = Number(row.quantityConsumed);
                          const remaining = Math.max(0, gross - consumed);
                          const remainingPct = gross > 0 ? Math.round((remaining / gross) * 100) : 0;
                          return (
                            <tr key={row.id} className="hover:bg-slate-700/20 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-slate-200 font-semibold whitespace-nowrap">
                                {row.unitCode ?? <span className="text-slate-500">—</span>}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-slate-300 text-xs">{row.unitModel ?? "—"}</span>
                                {row.unitType && (
                                  <span className="ml-1.5 text-xs text-indigo-300 bg-indigo-900/40 px-1.5 py-0.5 rounded">
                                    {row.unitType}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-white font-medium">
                                {row.matCode && (
                                  <span className="font-mono text-slate-400 text-xs mr-1">{row.matCode}</span>
                                )}
                                {row.matName ?? <span className="text-slate-500">—</span>}
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{row.matUnit ?? "—"}</td>
                              <td className="px-4 py-3 font-mono text-slate-200 text-xs whitespace-nowrap">
                                {gross.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-400 text-xs whitespace-nowrap">
                                {consumed > 0
                                  ? consumed.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                                  : <span className="text-slate-600">0</span>}
                              </td>
                              <td className="px-4 py-3 text-xs whitespace-nowrap">
                                <span className={`font-mono font-semibold ${
                                  remaining === 0 ? "text-slate-500" : remainingPct < 20 ? "text-red-400" : "text-green-400"
                                }`}>
                                  {remaining.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                </span>
                                {gross > 0 && (
                                  <span className="text-slate-500 ml-1">({remainingPct}%)</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <ForecastStatusBadge status={row.status} />
                              </td>
                              <td className="px-4 py-3 text-xs">
                                {row.purchaseRequisitionId ? (
                                  <a
                                    href={`/procurement/purchase-requisitions/${row.purchaseRequisitionId}`}
                                    className="text-blue-400 hover:text-blue-300 font-mono text-xs underline">
                                    View PR →
                                  </a>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
