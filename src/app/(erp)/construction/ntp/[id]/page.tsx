export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  taskAssignments, projectUnits, subcontractors, projects,
  dailyProgressEntries, workAccomplishedReports,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

const ACCENT = "#057a55";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: "#f3f4f6", color: "#6b7280" },
  ACTIVE:    { bg: "#dcfce7", color: "#166534" },
  COMPLETED: { bg: "#eff6ff", color: "#1e40af" },
  CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
};

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function NtpDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [ntp] = await db
    .select({
      id:                   taskAssignments.id,
      category:             taskAssignments.category,
      workType:             taskAssignments.workType,
      startDate:            taskAssignments.startDate,
      endDate:              taskAssignments.endDate,
      status:               taskAssignments.status,
      capacityCheckPassed:  taskAssignments.capacityCheckPassed,
      issuedAt:             taskAssignments.issuedAt,
      unitCode:             projectUnits.unitCode,
      unitModel:            projectUnits.unitModel,
      unitId:               projectUnits.id,
      subName:              subcontractors.name,
      subCode:              subcontractors.code,
      subId:                subcontractors.id,
      projName:             projects.name,
      projId:               projects.id,
    })
    .from(taskAssignments)
    .leftJoin(projectUnits,   eq(taskAssignments.unitId,    projectUnits.id))
    .leftJoin(subcontractors, eq(taskAssignments.subconId,  subcontractors.id))
    .leftJoin(projects,       eq(taskAssignments.projectId, projects.id))
    .where(eq(taskAssignments.id, id));

  if (!ntp) notFound();

  const [progressRows, warRows] = await Promise.all([
    db
      .select({
        id:             dailyProgressEntries.id,
        entryDate:      dailyProgressEntries.entryDate,
        status:         dailyProgressEntries.status,
        actualManpower: dailyProgressEntries.actualManpower,
        delayType:      dailyProgressEntries.delayType,
        docGapFlagged:  dailyProgressEntries.docGapFlagged,
        createdAt:      dailyProgressEntries.createdAt,
      })
      .from(dailyProgressEntries)
      .where(eq(dailyProgressEntries.taskAssignmentId, id))
      .orderBy(desc(dailyProgressEntries.entryDate)),
    db
      .select({
        id:                  workAccomplishedReports.id,
        grossAccomplishment: workAccomplishedReports.grossAccomplishment,
        status:              workAccomplishedReports.status,
        submittedAt:         workAccomplishedReports.submittedAt,
      })
      .from(workAccomplishedReports)
      .where(eq(workAccomplishedReports.taskAssignmentId, id))
      .orderBy(desc(workAccomplishedReports.submittedAt)),
  ]);

  const st = STATUS_STYLE[ntp.status] ?? { bg: "#f3f4f6", color: "#6b7280" };

  const WAR_STATUS: Record<string, { bg: string; color: string }> = {
    DRAFT:             { bg: "#f3f4f6", color: "#6b7280" },
    PENDING_REVIEW:    { bg: "#fef9c3", color: "#713f12" },
    PENDING_AUDIT:     { bg: "#eff6ff", color: "#1e40af" },
    APPROVED:          { bg: "#dcfce7", color: "#166534" },
    REJECTED:          { bg: "#fef2f2", color: "#b91c1c" },
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction/ntp" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← NTP Register</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
              NTP — {ntp.unitCode ?? "Unknown Unit"}
            </h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: st.bg, color: st.color }}>
                {ntp.status}
              </span>
              {ntp.capacityCheckPassed && (
                <span style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600 }}>✓ Capacity Check Passed</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a href={`/construction/log-progress`} style={{
              padding: "0.5rem 1rem", borderRadius: "6px", background: ACCENT,
              color: "#fff", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
            }}>+ Log Progress</a>
            <a href={`/construction/submit-war`} style={{
              padding: "0.5rem 1rem", borderRadius: "6px", background: "#fff", border: `1px solid ${ACCENT}`,
              color: ACCENT, fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
            }}>Submit WAR</a>
          </div>
        </div>

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Assignment Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}>
              <div style={LABEL}>Project</div>
              {ntp.projId
                ? <a href={`/master-list/projects/${ntp.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{ntp.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Unit</div>
              <div style={VALUE}>{ntp.unitCode} — {ntp.unitModel}</div>
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Subcontractor</div>
              {ntp.subId
                ? <a href={`/master-list/subcontractors/${ntp.subId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{ntp.subCode} — {ntp.subName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}><div style={LABEL}>Category</div><div style={VALUE}>{ntp.category}</div></div>
            <div style={FIELD}><div style={LABEL}>Work Type</div><div style={VALUE}>{ntp.workType}</div></div>
            <div style={FIELD}><div style={LABEL}>Issued At</div><div style={VALUE}>{new Date(ntp.issuedAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div></div>
            <div style={FIELD}><div style={LABEL}>Start Date</div><div style={VALUE}>{ntp.startDate}</div></div>
            <div style={FIELD}><div style={LABEL}>End Date</div><div style={VALUE}>{ntp.endDate}</div></div>
          </div>
        </div>

        {/* Daily Progress */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
            Daily Progress Entries ({progressRows.length})
          </h2>
          {progressRows.length === 0 ? (
            <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
              No progress entries yet. <a href="/construction/log-progress" style={{ color: ACCENT }}>Log progress →</a>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Date", "Status", "Manpower", "Delay", "Flagged", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.6rem 0.9rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {progressRows.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.6rem 0.9rem", fontWeight: 500, color: "#111827" }}>{p.entryDate}</td>
                      <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{p.status}</td>
                      <td style={{ padding: "0.6rem 0.9rem", color: "#374151" }}>{p.actualManpower}</td>
                      <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280", fontSize: "0.82rem" }}>{p.delayType ?? "—"}</td>
                      <td style={{ padding: "0.6rem 0.9rem" }}>
                        {p.docGapFlagged
                          ? <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#b91c1c" }}>⚠ Flagged</span>
                          : <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>—</span>}
                      </td>
                      <td style={{ padding: "0.6rem 0.9rem", textAlign: "right" }}>
                        <a href={`/construction/daily-progress/${p.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* WARs */}
        <div>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
            Work Accomplished Reports ({warRows.length})
          </h2>
          {warRows.length === 0 ? (
            <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
              No WARs submitted yet. <a href="/construction/submit-war" style={{ color: ACCENT }}>Submit WAR →</a>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Gross Accomplishment", "Status", "Submitted", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.6rem 0.9rem", textAlign: i === 0 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {warRows.map((w) => {
                    const ws = WAR_STATUS[w.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    return (
                      <tr key={w.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.6rem 0.9rem", fontWeight: 700, color: "#111827", textAlign: "right" }}>
                          PHP {Number(w.grossAccomplishment).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.6rem 0.9rem" }}>
                          <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: ws.bg, color: ws.color }}>
                            {w.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>
                          {new Date(w.submittedAt).toLocaleDateString("en-PH")}
                        </td>
                        <td style={{ padding: "0.6rem 0.9rem", textAlign: "right" }}>
                          <a href={`/construction/war/${w.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
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
    </main>
  );
}
