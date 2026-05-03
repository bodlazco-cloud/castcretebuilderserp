export const dynamic = "force-dynamic";
import type React from "react";
import { db } from "@/db";
import {
  projects, unitActivities, activityDefinitions, projectUnits,
} from "@/db/schema";
import { min, max, count, sql, eq, isNotNull, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#1a56db";

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

type GanttRow = {
  activityDefId:   string;
  sequenceOrder:   number | null;
  activityCode:    string;
  scopeName:       string;
  minPlannedStart: string | null;
  maxPlannedEnd:   string | null;
  minActualStart:  string | null;
  maxActualEnd:    string | null;
  totalCount:      number;
  completeCount:   number;
  inProgressCount: number;
};

export default async function GanttPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  await getAuthUser();
  const { project: projectId } = await searchParams;

  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .orderBy(projects.name);

  let ganttRows: GanttRow[] = [];

  if (projectId) {
    ganttRows = await db
      .select({
        activityDefId:   activityDefinitions.id,
        sequenceOrder:   activityDefinitions.sequenceOrder,
        activityCode:    activityDefinitions.activityCode,
        scopeName:       activityDefinitions.scopeName,
        minPlannedStart: min(unitActivities.plannedStart),
        maxPlannedEnd:   max(unitActivities.plannedEnd),
        minActualStart:  min(unitActivities.actualStart),
        maxActualEnd:    max(unitActivities.actualEnd),
        totalCount:      count(unitActivities.id),
        completeCount:   sql<number>`COUNT(CASE WHEN ${unitActivities.status} = 'COMPLETE' THEN 1 END)`,
        inProgressCount: sql<number>`COUNT(CASE WHEN ${unitActivities.status} = 'IN_PROGRESS' THEN 1 END)`,
      })
      .from(unitActivities)
      .innerJoin(activityDefinitions, eq(unitActivities.activityDefId, activityDefinitions.id))
      .innerJoin(projectUnits, eq(unitActivities.unitId, projectUnits.id))
      .where(and(eq(projectUnits.projectId, projectId), isNotNull(unitActivities.plannedStart)))
      .groupBy(
        activityDefinitions.id,
        activityDefinitions.sequenceOrder,
        activityDefinitions.activityCode,
        activityDefinitions.scopeName,
      )
      .orderBy(activityDefinitions.sequenceOrder);
  }

  const allDates = ganttRows.flatMap((r) =>
    [r.minPlannedStart, r.maxPlannedEnd].filter(Boolean) as string[],
  );
  const minDate = allDates.length ? allDates.reduce((a, b) => (a < b ? a : b)) : null;
  const maxDate = allDates.length ? allDates.reduce((a, b) => (a > b ? a : b)) : null;
  const totalDays = minDate && maxDate ? daysBetween(minDate, maxDate) || 1 : 1;
  const today = new Date().toISOString().slice(0, 10);

  const thStyle: React.CSSProperties = {
    padding: "0.6rem 1rem", fontWeight: 600, fontSize: "0.75rem",
    color: "#374151", textTransform: "uppercase" as const,
    letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap",
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1400px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/planning" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Planning & Engineering
          </a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            Project Gantt — Schedule View
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
            Planned date range per activity phase · progress sourced from milestone tagging
          </p>
        </div>

        {/* Project selector */}
        <form method="GET" style={{ marginBottom: "1.5rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <select
            name="project"
            defaultValue={projectId ?? ""}
            style={{
              padding: "0.55rem 0.9rem", border: "1px solid #d1d5db", borderRadius: "6px",
              fontSize: "0.875rem", minWidth: "260px", background: "#fff",
            }}
          >
            <option value="">Select project…</option>
            {projectRows.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, border: "none", cursor: "pointer",
            }}
          >
            View Schedule
          </button>
        </form>

        {!projectId && (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            Select a project above to view its Gantt schedule.
          </div>
        )}

        {projectId && ganttRows.length === 0 && (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No unit activities with planned dates found for this project.
            Assign planned dates via milestone tagging to populate the schedule.
          </div>
        )}

        {ganttRows.length > 0 && minDate && maxDate && (
          <>
            {/* Legend */}
            <div style={{ display: "flex", gap: "1.25rem", marginBottom: "1rem", flexWrap: "wrap", fontSize: "0.78rem" }}>
              {[
                { bg: "#bbf7d0", border: "#16a34a", label: "Planned (not started)" },
                { bg: "#16a34a", border: "#166534", label: "Complete" },
                { bg: "#3b82f6", border: "#1d4ed8", label: "In Progress" },
                { bg: "#fca5a5", border: "#dc2626", label: "Overdue" },
                { bg: "#cbd5e1", border: "#64748b", label: "Actual range" },
              ].map(({ bg, border, label }) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#374151" }}>
                  <span style={{ display: "inline-block", width: "18px", height: "10px", background: bg, border: `1px solid ${border}`, borderRadius: "2px" }} />
                  {label}
                </span>
              ))}
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#ef4444" }}>
                <span style={{ display: "inline-block", width: "2px", height: "12px", background: "#ef4444", borderRadius: "1px" }} />
                Today
              </span>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              {/* Date ruler */}
              <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", borderBottom: "2px solid #e5e7eb" }}>
                <div style={{ ...thStyle, borderRight: "1px solid #e5e7eb" }}>Phase</div>
                <div style={{ position: "relative", height: "32px", overflow: "hidden" }}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const offsetDays = Math.round((totalDays / 6) * i);
                    const d = new Date(new Date(minDate).getTime() + offsetDays * 86_400_000);
                    const label = d.toLocaleDateString("en-PH", {
                      month: "short", day: "numeric",
                      ...(i === 0 || i === 6 ? { year: "2-digit" } : {}),
                    });
                    return (
                      <span
                        key={i}
                        style={{
                          position: "absolute",
                          left: `${(offsetDays / totalDays) * 100}%`,
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: "0.68rem",
                          color: "#9ca3af",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Rows */}
              {ganttRows.map((row, idx) => {
                const total    = Number(row.totalCount);
                const complete = Number(row.completeCount);
                const progressPct = total > 0 ? Math.round((complete / total) * 100) : 0;

                const hasPlanned  = Boolean(row.minPlannedStart && row.maxPlannedEnd);
                const isOverdue   = hasPlanned && row.maxPlannedEnd! < today && progressPct < 100;

                const barLeft  = hasPlanned ? (daysBetween(minDate, row.minPlannedStart!) / totalDays) * 100 : 0;
                const barWidth = hasPlanned
                  ? Math.max(0.5, (daysBetween(row.minPlannedStart!, row.maxPlannedEnd!) / totalDays) * 100)
                  : 0;

                const hasActual   = Boolean(row.minActualStart);
                const actualEnd   = row.maxActualEnd && row.maxActualEnd < maxDate ? row.maxActualEnd : maxDate;
                const actualLeft  = hasActual ? Math.max(0, (daysBetween(minDate, row.minActualStart!) / totalDays) * 100) : 0;
                const actualWidth = hasActual
                  ? Math.max(0.3, (daysBetween(row.minActualStart!, actualEnd) / totalDays) * 100)
                  : 0;

                const barBg     = isOverdue ? "#fca5a5" : progressPct === 100 ? "#16a34a" : progressPct > 0 ? "#3b82f6" : "#bbf7d0";
                const barBorder = isOverdue ? "#dc2626" : progressPct === 100 ? "#166534" : progressPct > 0 ? "#1d4ed8" : "#16a34a";

                const todayLeft = today >= minDate && today <= maxDate
                  ? (daysBetween(minDate, today) / totalDays) * 100
                  : null;

                return (
                  <div
                    key={row.activityDefId}
                    style={{
                      display: "grid", gridTemplateColumns: "240px 1fr",
                      borderBottom: idx < ganttRows.length - 1 ? "1px solid #f3f4f6" : "none",
                      background: idx % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    {/* Label */}
                    <div style={{
                      padding: "0.65rem 1rem", borderRight: "1px solid #e5e7eb",
                      display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.15rem",
                    }}>
                      <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "#111827" }}>
                        {row.scopeName}
                      </span>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "#6b7280" }}>
                          {row.activityCode}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "#9ca3af" }}>
                          {complete}/{total} units
                        </span>
                        {isOverdue && (
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#dc2626", letterSpacing: "0.03em" }}>
                            OVERDUE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bar track */}
                    <div style={{ position: "relative", minHeight: "52px", padding: "0.5rem 0" }}>
                      {/* Today marker */}
                      {todayLeft !== null && (
                        <div style={{
                          position: "absolute", left: `${todayLeft}%`,
                          top: 0, bottom: 0, width: "1px",
                          background: "rgba(239,68,68,0.5)", zIndex: 1,
                        }} />
                      )}

                      {/* Planned bar */}
                      {hasPlanned && (
                        <div style={{
                          position: "absolute", top: "8px", height: "16px",
                          left: `${Math.max(0, barLeft)}%`,
                          width: `${barWidth}%`,
                          background: barBg,
                          border: `1px solid ${barBorder}`,
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}>
                          {/* In-progress fill overlay */}
                          {progressPct > 0 && progressPct < 100 && (
                            <div style={{
                              position: "absolute", left: 0, top: 0, bottom: 0,
                              width: `${progressPct}%`,
                              background: "#1d4ed8",
                              opacity: 0.3,
                            }} />
                          )}
                        </div>
                      )}

                      {/* Actual range underbar */}
                      {hasActual && (
                        <div style={{
                          position: "absolute", top: "28px", height: "5px",
                          left: `${Math.max(0, actualLeft)}%`,
                          width: `${actualWidth}%`,
                          background: "#94a3b8",
                          borderRadius: "3px",
                        }} />
                      )}

                      {/* Progress % label */}
                      {hasPlanned && (
                        <span style={{
                          position: "absolute",
                          top: "9px",
                          left: `${Math.min(97, Math.max(0, barLeft) + barWidth + 0.5)}%`,
                          fontSize: "0.65rem",
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                          lineHeight: "16px",
                        }}>
                          {progressPct}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#9ca3af" }}>
              Each row = one activity phase across all units in the selected project.
              Bar span = earliest <code>planned_start</code> → latest <code>planned_end</code> across all units.
              Progress = units with status <code>COMPLETE</code> ÷ total units.
              Gray underbar = actual work start/end range recorded in milestone tagging.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
