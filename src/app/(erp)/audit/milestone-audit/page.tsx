export const dynamic = "force-dynamic";
import { db } from "@/db";
import { workAccomplishedReports, projects, projectUnits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const ACCENT = "#0694a2";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:          { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW: { bg: "#fef9c3", color: "#713f12" },
  PENDING_AUDIT:  { bg: "#fff7ed", color: "#9a3412" },
  APPROVED:       { bg: "#dcfce7", color: "#166534" },
  REJECTED:       { bg: "#fef2f2", color: "#b91c1c" },
};

function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
  ]).catch(() => fallback);
}

function fmtDate(val: Date | string | null | undefined): string {
  if (!val) return "—";
  const d = new Date(val);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function MilestoneAuditPage() {
  type WARRow = {
    id: string;
    status: string | null;
    grossAccomplishment: string | null;
    submittedAt: Date | null;
    auditVerifiedAt: Date | null;
    bodApprovedAt: Date | null;
    rejectionReason: string | null;
    projectName: string | null;
    unitCode: string | null;
    unitModel: string | null;
  };

  const rows: WARRow[] = await safe(
    () =>
      db
        .select({
          id: workAccomplishedReports.id,
          status: workAccomplishedReports.status,
          grossAccomplishment: workAccomplishedReports.grossAccomplishment,
          submittedAt: workAccomplishedReports.submittedAt,
          auditVerifiedAt: workAccomplishedReports.auditVerifiedAt,
          bodApprovedAt: workAccomplishedReports.bodApprovedAt,
          rejectionReason: workAccomplishedReports.rejectionReason,
          projectName: projects.name,
          unitCode: projectUnits.unitCode,
          unitModel: projectUnits.unitModel,
        })
        .from(workAccomplishedReports)
        .leftJoin(projects, eq(workAccomplishedReports.projectId, projects.id))
        .leftJoin(projectUnits, eq(workAccomplishedReports.unitId, projectUnits.id))
        .orderBy(desc(workAccomplishedReports.submittedAt))
        .limit(200),
    [] as WARRow[]
  );

  const totalWARs = rows.length;
  const pendingAudit = rows.filter((r) => r.status === "PENDING_AUDIT").length;
  const approved = rows.filter((r) => r.status === "APPROVED").length;
  const rejected = rows.filter((r) => r.status === "REJECTED").length;

  const kpis = [
    { label: "Total WARs", value: totalWARs, accent: ACCENT },
    { label: "Pending Audit", value: pendingAudit, accent: "#e3a008" },
    { label: "Approved", value: approved, accent: "#057a55" },
    { label: "Rejected", value: rejected, accent: "#dc2626" },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Audit & Quality
          </a>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
            Milestone Audit
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            Review Work Accomplished Reports submitted for milestone verification
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
          {kpis.map((k) => (
            <div
              key={k.label}
              style={{
                background: "#fff",
                borderRadius: "8px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                padding: "1.25rem 1.5rem",
                borderTop: `3px solid ${k.accent}`,
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                {k.label}
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: k.accent }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: "0.95rem",
            }}
          >
            No Work Accomplished Reports found.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "960px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["WAR #", "Project", "Unit", "Accomplishment", "Submitted", "Audit Verified", "BOD Approved", "Status"].map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: "0.75rem 1rem",
                          textAlign: "left",
                          fontWeight: 600,
                          color: "#374151",
                          fontSize: "0.8rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isPendingAudit = r.status === "PENDING_AUDIT";
                    const isRejected = r.status === "REJECTED";
                    const statusStyle = STATUS_STYLE[r.status ?? ""] ?? { bg: "#f3f4f6", color: "#6b7280" };

                    const unitLabel =
                      r.unitCode && r.unitModel
                        ? `${r.unitCode} · ${r.unitModel}`
                        : r.unitCode || r.unitModel || "—";

                    const accomplishment =
                      r.grossAccomplishment != null
                        ? `${Number(r.grossAccomplishment).toLocaleString("en-PH", { minimumFractionDigits: 2 })}%`
                        : "—";

                    const auditVerifiedCell = r.auditVerifiedAt ? (
                      <span style={{ color: "#166534", fontWeight: 600 }}>✓ {fmtDate(r.auditVerifiedAt)}</span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>Pending</span>
                    );

                    const bodApprovedCell = r.bodApprovedAt ? (
                      fmtDate(r.bodApprovedAt)
                    ) : (
                      <span style={{ color: "#9ca3af" }}>Pending</span>
                    );

                    return (
                      <tr
                        key={r.id}
                        style={{
                          background: isPendingAudit ? "#fff7ed" : undefined,
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", verticalAlign: "top" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "#374151" }}>
                            #{r.id.slice(0, 8)}...
                          </span>
                          {isRejected && r.rejectionReason && (
                            <div style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: "0.2rem", maxWidth: "160px", wordBreak: "break-word" }}>
                              {r.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#374151" }}>
                          {r.projectName ?? "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#374151" }}>
                          {unitLabel}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#374151", fontVariantNumeric: "tabular-nums" }}>
                          {accomplishment}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {fmtDate(r.submittedAt)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                          {auditVerifiedCell}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {bodApprovedCell}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "0.2rem 0.6rem",
                              borderRadius: "999px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.status ?? "—"}
                          </span>
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
