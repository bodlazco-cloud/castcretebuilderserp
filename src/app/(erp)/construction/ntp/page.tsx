export const dynamic = "force-dynamic";
import { db } from "@/db";
import { taskAssignments, projectUnits, subcontractors, projects } from "@/db/schema";
import { phaseScopes } from "@/db/schema/phases";
import { eq, desc } from "drizzle-orm";
import { getAuthUser, isAdminOrBod, canReviewNtp } from "@/lib/supabase-server";
import { NtpRowActions } from "./NtpRowActions";

const ACCENT = "#057a55";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:          { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW: { bg: "#eff6ff", color: "#1e40af" },
  PENDING_BOD:    { bg: "#fef9c3", color: "#713f12" },
  ACTIVE:         { bg: "#dcfce7", color: "#166534" },
  REJECTED:       { bg: "#fef2f2", color: "#b91c1c" },
  COMPLETED:      { bg: "#e0e7ff", color: "#3730a3" },
  CANCELLED:      { bg: "#f3f4f6", color: "#6b7280" },
};

export default async function NtpRegisterPage() {
  const user = await getAuthUser();
  const [canApprove, canReview] = await Promise.all([
    isAdminOrBod().catch(() => false),
    canReviewNtp().catch(() => false),
  ]);
  const userId = user?.id ?? "";

  const rows = await db
    .select({
      id:          taskAssignments.id,
      category:    taskAssignments.category,
      workType:    taskAssignments.workType,
      startDate:   taskAssignments.startDate,
      endDate:     taskAssignments.endDate,
      status:      taskAssignments.status,
      issuedAt:    taskAssignments.issuedAt,
      submittedAt: taskAssignments.submittedAt,
      rejectionReason: taskAssignments.rejectionReason,
      unitCode:    projectUnits.unitCode,
      unitModel:   projectUnits.unitModel,
      subName:     subcontractors.name,
      subCode:     subcontractors.code,
      projName:    projects.name,
      scopeName:   phaseScopes.name,
    })
    .from(taskAssignments)
    .leftJoin(projectUnits,  eq(taskAssignments.unitId,       projectUnits.id))
    .leftJoin(subcontractors, eq(taskAssignments.subconId,    subcontractors.id))
    .leftJoin(projects,       eq(taskAssignments.projectId,   projects.id))
    .leftJoin(phaseScopes,    eq(taskAssignments.phaseScopeId, phaseScopes.id))
    .orderBy(desc(taskAssignments.issuedAt));

  const counts = Object.fromEntries(
    ["DRAFT","PENDING_BOD","ACTIVE","REJECTED","COMPLETED","CANCELLED"].map((s) => [
      s, rows.filter((r) => r.status === s).length,
    ]),
  );

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>NTP Register</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Notice-to-Proceed register — drafts require BOD approval before becoming active.
            </p>
          </div>
          <a href="/construction/issue-ntp" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Issue NTP</a>
        </div>

        {/* Status summary chips */}
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {Object.entries(counts).map(([s, n]) => {
              if (n === 0) return null;
              const st = STATUS_STYLE[s] ?? { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <span key={s} style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, background: st.bg, color: st.color }}>
                  {s.replace("_", " ")}: {n}
                </span>
              );
            })}
          </div>
        )}

        {/* BOD pending banner */}
        {counts["PENDING_BOD"] > 0 && canApprove && (
          <div style={{ marginBottom: "1rem", padding: "0.85rem 1.1rem", background: "#fef9c3", border: "1px solid #fde047", borderRadius: "8px", fontSize: "0.875rem", color: "#713f12", fontWeight: 500 }}>
            ⚡ {counts["PENDING_BOD"]} NTP{counts["PENDING_BOD"] !== 1 ? "s" : ""} awaiting your BOD approval below.
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No NTPs issued yet. <a href="/construction/issue-ntp" style={{ color: ACCENT }}>Issue first NTP →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "1000px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Unit", "Subcontractor", "Scope", "Work Type", "Start", "End", "Status", "Actions"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: r.status === "PENDING_BOD" && canApprove ? "#fffbeb" : "transparent" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#111827" }}>{r.unitCode ?? "—"}</span>
                          {r.unitModel && <span style={{ marginLeft: "0.35rem", fontSize: "0.78rem", color: "#9ca3af" }}>{r.unitModel}</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.subName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {r.scopeName
                            ? <span style={{ fontSize: "0.8rem", background: "#dcfce7", color: "#166534", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 600 }}>{r.scopeName}</span>
                            : <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.workType}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{r.startDate}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{r.endDate}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {r.status.replace("_", " ")}
                          </span>
                          {r.rejectionReason && (
                            <div style={{ fontSize: "0.72rem", color: "#b91c1c", marginTop: "0.2rem", maxWidth: "180px" }} title={r.rejectionReason}>
                              ↳ {r.rejectionReason.length > 40 ? r.rejectionReason.slice(0, 40) + "…" : r.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <NtpRowActions
                            ntpId={r.id}
                            status={r.status}
                            userId={userId}
                            canReview={canReview}
                            canApprove={canApprove}
                            canDeleteActive={canApprove}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
