export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  dailyProgressEntries, projectUnits, subcontractors,
  projects, taskAssignments, unitActivities, activityDefinitions,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

const ACCENT = "#057a55";
const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

const DELAY_LABELS: Record<string, string> = {
  WEATHER:             "Weather",
  MATERIAL_DELAY:      "Material Delay",
  MANPOWER_SHORTAGE:   "Manpower Shortage",
  EQUIPMENT_BREAKDOWN: "Equipment Breakdown",
  DESIGN_CHANGE:       "Design Change",
  OTHER:               "Other",
};

export default async function DailyProgressDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [entry] = await db
    .select({
      id:                 dailyProgressEntries.id,
      entryDate:          dailyProgressEntries.entryDate,
      status:             dailyProgressEntries.status,
      actualManpower:     dailyProgressEntries.actualManpower,
      manpowerBreakdown:  dailyProgressEntries.manpowerBreakdown,
      delayType:          dailyProgressEntries.delayType,
      issuesDetails:      dailyProgressEntries.issuesDetails,
      docGapFlagged:      dailyProgressEntries.docGapFlagged,
      createdAt:          dailyProgressEntries.createdAt,
      unitCode:           projectUnits.unitCode,
      unitModel:          projectUnits.unitModel,
      unitId:             projectUnits.id,
      subName:            subcontractors.name,
      subCode:            subcontractors.code,
      subId:              subcontractors.id,
      projName:           projects.name,
      projId:             projects.id,
      ntpId:              taskAssignments.id,
      activityCode:       activityDefinitions.activityCode,
      activityName:       activityDefinitions.activityName,
    })
    .from(dailyProgressEntries)
    .leftJoin(projectUnits,       eq(dailyProgressEntries.unitId,           projectUnits.id))
    .leftJoin(subcontractors,     eq(dailyProgressEntries.subconId,         subcontractors.id))
    .leftJoin(projects,           eq(dailyProgressEntries.projectId,        projects.id))
    .leftJoin(taskAssignments,    eq(dailyProgressEntries.taskAssignmentId, taskAssignments.id))
    .leftJoin(unitActivities,     eq(dailyProgressEntries.unitActivityId,   unitActivities.id))
    .leftJoin(activityDefinitions, eq(unitActivities.activityDefId,         activityDefinitions.id))
    .where(eq(dailyProgressEntries.id, id));

  if (!entry) notFound();

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction/daily-progress" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Daily Progress</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
              Progress Entry — {entry.entryDate}
            </h1>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{entry.unitCode} · {entry.projName}</span>
              {entry.docGapFlagged && (
                <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "#fef2f2", color: "#b91c1c" }}>
                  ⚠ Flagged
                </span>
              )}
            </div>
          </div>
          {entry.ntpId && (
            <a href={`/construction/ntp/${entry.ntpId}`} style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>
              View NTP →
            </a>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Entry Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}>
              <div style={LABEL}>Project</div>
              {entry.projId
                ? <a href={`/master-list/projects/${entry.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{entry.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Unit</div>
              <div style={VALUE}>{entry.unitCode} — {entry.unitModel}</div>
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Subcontractor</div>
              {entry.subId
                ? <a href={`/master-list/subcontractors/${entry.subId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{entry.subName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}><div style={LABEL}>Entry Date</div><div style={VALUE}>{entry.entryDate}</div></div>
            <div style={FIELD}><div style={LABEL}>Status</div><div style={VALUE}>{entry.status}</div></div>
            <div style={FIELD}><div style={LABEL}>Actual Manpower</div><div style={VALUE}>{entry.actualManpower} workers</div></div>
            {entry.activityCode && (
              <div style={{ ...FIELD, gridColumn: "span 2" }}>
                <div style={LABEL}>Activity</div>
                <div style={VALUE}>{entry.activityCode} — {entry.activityName}</div>
              </div>
            )}
          </div>
        </div>

        {(entry.delayType || entry.issuesDetails) && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde047", borderRadius: "8px", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#713f12" }}>Issues / Delays</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {entry.delayType && (
                <div style={FIELD}>
                  <div style={{ ...LABEL, color: "#713f12" }}>Delay Type</div>
                  <div style={VALUE}>{DELAY_LABELS[entry.delayType] ?? entry.delayType}</div>
                </div>
              )}
              {entry.issuesDetails && (
                <div style={FIELD}>
                  <div style={{ ...LABEL, color: "#713f12" }}>Issue Details</div>
                  <div style={{ ...VALUE, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{entry.issuesDetails}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
            Entry ID: <span style={{ fontFamily: "monospace" }}>{entry.id}</span>
            <span style={{ margin: "0 0.5rem" }}>·</span>
            Logged: {new Date(entry.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}
          </div>
        </div>
      </div>
    </main>
  );
}
