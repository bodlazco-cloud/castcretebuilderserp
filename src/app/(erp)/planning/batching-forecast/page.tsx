export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  resourceForecasts, masterBomEntries, materials, projectUnits, projects,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING_PR: { label: "Pending PR",  cls: "bg-red-900/50 text-red-300" },
  PR_CREATED: { label: "PR Created",  cls: "bg-yellow-900/50 text-yellow-300" },
  PO_ISSUED:  { label: "PO Issued",   cls: "bg-blue-900/50 text-blue-300" },
  ISSUED:     { label: "Issued",      cls: "bg-green-900/50 text-green-300" },
};

export default async function BatchingForecastPage() {
  const rows = await safe(
    db.select({
      id:           resourceForecasts.id,
      grossQty:     resourceForecasts.grossQuantity,
      consumed:     resourceForecasts.quantityConsumed,
      status:       resourceForecasts.status,
      unitCode:     projectUnits.unitCode,
      unitModel:    projectUnits.unitModel,
      matName:      materials.name,
      matUnit:      materials.unit,
      projectName:  projects.name,
    })
      .from(resourceForecasts)
      .leftJoin(masterBomEntries, eq(resourceForecasts.masterBomEntryId, masterBomEntries.id))
      .leftJoin(materials,        eq(masterBomEntries.materialId,        materials.id))
      .leftJoin(projectUnits,     eq(resourceForecasts.unitId,           projectUnits.id))
      .leftJoin(projects,         eq(resourceForecasts.projectId,        projects.id))
      .where(eq(resourceForecasts.forecastType, "CONCRETE"))
      .orderBy(desc(resourceForecasts.createdAt)),
    [] as {
      id: string; grossQty: string; consumed: string; status: string;
      unitCode: string | null; unitModel: string | null; matName: string | null; matUnit: string | null; projectName: string | null;
    }[],
  );

  const totalGross = rows.reduce((a, r) => a + Number(r.grossQty), 0);
  const totalIssued = rows.filter((r) => r.status === "ISSUED").reduce((a, r) => a + Number(r.grossQty), 0);
  const totalPending = rows.filter((r) => r.status === "PENDING_PR").length;

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-screen text-white">
      <div>
        <h1 className="text-2xl font-bold text-white">Batching Forecast</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Concrete volume requirements derived from NTP-triggered BOM entries
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Lines</div>
          <div className="text-3xl font-bold text-cyan-400 mt-1">{rows.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Volume</div>
          <div className="text-3xl font-bold text-white mt-1">{totalGross.toLocaleString("en-PH", { maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-zinc-500">gross units</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Issued Volume</div>
          <div className="text-3xl font-bold text-green-400 mt-1">{totalIssued.toLocaleString("en-PH", { maximumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Pending PR</div>
          <div className="text-3xl font-bold text-red-400 mt-1">{totalPending}</div>
        </div>
      </div>

      {/* Info callout */}
      <div className="bg-cyan-900/20 border border-cyan-800/40 rounded-xl p-4 text-sm text-cyan-300">
        Concrete forecasts are auto-generated when a project unit status is set to <strong>NTP_ISSUED</strong>.
        Materials with category <strong>CONCRETE</strong> in the approved Master BOM trigger these forecast lines.
        Production planning is managed in the Batching Plant section.
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">Concrete Forecast Lines</h2>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-sm">
            No concrete forecast lines yet. Approve BOM entries with concrete materials, then issue NTPs to generate forecasts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Project", "Unit Code", "Concrete Mix / Material", "Unit", "Gross Volume", "Consumed", "Remaining", "Status"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs text-zinc-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const gross = Number(row.grossQty);
                  const consumed = Number(row.consumed);
                  const remaining = gross - consumed;
                  const badge = STATUS_CFG[row.status] ?? { label: row.status, cls: "bg-zinc-700 text-zinc-200" };
                  return (
                    <tr key={row.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-3 px-4 text-zinc-300">{row.projectName ?? "—"}</td>
                      <td className="py-3 px-4 text-zinc-100 font-mono text-xs">{row.unitCode ?? "—"}</td>
                      <td className="py-3 px-4 text-zinc-100">{row.matName ?? "—"}</td>
                      <td className="py-3 px-4 text-zinc-400">{row.matUnit ?? "—"}</td>
                      <td className="py-3 px-4 text-zinc-100 font-medium">{gross.toLocaleString("en-PH", { maximumFractionDigits: 4 })}</td>
                      <td className="py-3 px-4 text-zinc-400">{consumed.toLocaleString("en-PH", { maximumFractionDigits: 4 })}</td>
                      <td className={`py-3 px-4 font-medium ${remaining <= 0 ? "text-green-400" : "text-white"}`}>
                        {remaining.toLocaleString("en-PH", { maximumFractionDigits: 4 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
