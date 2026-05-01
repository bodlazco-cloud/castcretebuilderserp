import { db } from "@/db";
import { projectUnits, projects } from "@/db/schema";
import { count, eq, ne, sum } from "drizzle-orm";

const PHASES = [
  { key: "STRUCTURAL",    label: "Structural",    color: "#f59e0b", bg: "#fef3c7" },
  { key: "ARCHITECTURAL", label: "Architectural", color: "#3b82f6", bg: "#dbeafe" },
  { key: "TURNOVER",      label: "Turned Over",   color: "#10b981", bg: "#d1fae5" },
] as const;

export default async function ProgressOverview() {
  let phaseCounts: Record<string, number> = {};
  let targetPerMonth = 120;
  let totalActive = 0;

  try {
    const [phaseRows, targetRow] = await Promise.all([
      db.select({ category: projectUnits.currentCategory, n: count() })
        .from(projectUnits)
        .groupBy(projectUnits.currentCategory),
      db.select({ t: sum(projects.targetUnitsPerMonth) })
        .from(projects)
        .where(ne(projects.status, "CANCELLED")),
    ]);

    phaseRows.forEach((r) => {
      phaseCounts[r.category] = Number(r.n);
    });
    totalActive = phaseRows.reduce((acc, r) => acc + Number(r.n), 0);
    targetPerMonth = Number(targetRow[0]?.t ?? 120) || 120;
  } catch {
    // DB not configured — show placeholder
    phaseCounts = { STRUCTURAL: 48, ARCHITECTURAL: 29, TURNOVER: 7 };
    totalActive = 84;
  }

  const turnoverCount = phaseCounts["TURNOVER"] ?? 0;
  const progressPct = Math.min(Math.round((turnoverCount / targetPerMonth) * 100), 100);

  return (
    <div>
      {/* Phase breakdown bars */}
      <div className="space-y-3 mb-6">
        {PHASES.map(({ key, label, color, bg }) => {
          const n = phaseCounts[key] ?? 0;
          const pct = totalActive > 0 ? Math.round((n / totalActive) * 100) : 0;
          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className="text-sm font-bold text-slate-900">
                  {n} <span className="text-xs text-slate-400 font-normal">units</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly turnover progress */}
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
      >
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-0.5">Monthly Turnover</p>
          <p className="text-2xl font-black text-slate-900">
            {turnoverCount}
            <span className="text-base font-semibold text-slate-400"> / {targetPerMonth}</span>
          </p>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-black"
            style={{ color: progressPct >= 80 ? "#10b981" : progressPct >= 50 ? "#f59e0b" : "#ef4444" }}
          >
            {progressPct}%
          </div>
          <div className="text-xs text-slate-400 font-medium">of monthly target</div>
        </div>
      </div>
    </div>
  );
}
