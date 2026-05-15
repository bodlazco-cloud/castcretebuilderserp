export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  resourceForecasts, masterBomEntries, projectUnits, projects,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING_PR: { label: "Pending",    cls: "bg-red-900/50 text-red-300" },
  PR_CREATED: { label: "PR Created", cls: "bg-yellow-900/50 text-yellow-300" },
  PO_ISSUED:  { label: "PO Issued",  cls: "bg-blue-900/50 text-blue-300" },
  ISSUED:     { label: "Deployed",   cls: "bg-green-900/50 text-green-300" },
};

export default async function MotorpoolNeedsPage() {
  const rows = await safe(
    db.select({
      id:            resourceForecasts.id,
      grossQty:      resourceForecasts.grossQuantity,
      status:        resourceForecasts.status,
      equipmentType: resourceForecasts.equipmentType,
      unitCode:      projectUnits.unitCode,
      unitModel:     projectUnits.unitModel,
      projectName:   projects.name,
    })
      .from(resourceForecasts)
      .leftJoin(masterBomEntries, eq(resourceForecasts.masterBomEntryId, masterBomEntries.id))
      .leftJoin(projectUnits,     eq(resourceForecasts.unitId,           projectUnits.id))
      .leftJoin(projects,         eq(resourceForecasts.projectId,        projects.id))
      .where(eq(resourceForecasts.forecastType, "EQUIPMENT"))
      .orderBy(desc(resourceForecasts.createdAt)),
    [] as {
      id: string; grossQty: string; status: string; equipmentType: string | null;
      unitCode: string | null; unitModel: string | null; projectName: string | null;
    }[],
  );

  const totalNeeded = rows.length;
  const totalPending = rows.filter((r) => r.status === "PENDING_PR").length;
  const uniqueEquipmentTypes = new Set(rows.map((r) => r.equipmentType).filter(Boolean)).size;

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-screen text-white">
      <div>
        <h1 className="text-2xl font-bold text-white">Motorpool Needs</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Equipment requirements from NTP-triggered BOM entries
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Equipment Lines</div>
          <div className="text-3xl font-bold text-orange-400 mt-1">{totalNeeded}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Pending Deployment</div>
          <div className="text-3xl font-bold text-red-400 mt-1">{totalPending}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Equipment Types</div>
          <div className="text-3xl font-bold text-white mt-1">{uniqueEquipmentTypes}</div>
        </div>
      </div>

      {/* Info callout */}
      <div className="bg-orange-900/20 border border-orange-800/40 rounded-xl p-4 text-sm text-orange-300">
        Equipment needs are derived from BOM entries that have an <strong>Equipment Type</strong> specified.
        These are auto-generated when a project unit is NTP-issued.
        Equipment scheduling and deployment is managed in the Motorpool section.
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">Equipment Forecast Lines</h2>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-sm">
            No equipment needs yet. Add equipment types to approved BOM entries, then issue NTPs to generate these lines.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Project", "Unit Code", "Unit Model", "Equipment Type", "Qty", "Status"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs text-zinc-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const badge = STATUS_CFG[row.status] ?? { label: row.status, cls: "bg-zinc-700 text-zinc-200" };
                  return (
                    <tr key={row.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-3 px-4 text-zinc-300">{row.projectName ?? "—"}</td>
                      <td className="py-3 px-4 text-zinc-100 font-mono text-xs">{row.unitCode ?? "—"}</td>
                      <td className="py-3 px-4 text-zinc-400">{row.unitModel ?? "—"}</td>
                      <td className="py-3 px-4 text-zinc-100 font-medium">{row.equipmentType ?? "—"}</td>
                      <td className="py-3 px-4 text-zinc-100">{Number(row.grossQty).toLocaleString("en-PH", { maximumFractionDigits: 2 })}</td>
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
