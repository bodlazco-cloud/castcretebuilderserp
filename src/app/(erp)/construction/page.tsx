export const dynamic = "force-dynamic";
import type React from "react";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count, countDistinct, desc } from "drizzle-orm";

const ACCENT = "#057a55";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#057a55",
  DRAFT: "#6b7280",
  COMPLETED: "#1a56db",
  CANCELLED: "#e02424",
};

function StatusBadge({ status }: { status: string }) {
  const bg = STATUS_COLORS[status] ?? "#6b7280";
  return (
    <span style={{
      display: "inline-block",
      padding: "0.2rem 0.55rem",
      borderRadius: "999px",
      fontSize: "0.72rem",
      fontWeight: 600,
      background: bg,
      color: "#fff",
      letterSpacing: "0.02em",
    }}>
      {status}
    </span>
  );
}

export default async function ConstructionPage() {
  let user = null;
  try {
    user = await getAuthUser();
  } catch {}

  const deptCode: string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";

  let activeNtps = 0;
  let unitsInProgress = 0;
  let warsPendingReview = 0;
  let flaggedEntries = 0;
  let taskRows: {
    unitCode: string;
    subcontractorName: string;
    category: string;
    workType: string;
    startDate: string;
    endDate: string;
    status: string;
  }[] = [];
  let warRows: {
    unitCode: string;
    grossAmount: string;
    status: string;
    submittedAt: Date | null;
  }[] = [];

  try {
    const [ntpResult] = await db
      .select({ value: count() })
      .from(schema.taskAssignments)
      .where(eq(schema.taskAssignments.status, "ACTIVE"));
    activeNtps = Number(ntpResult?.value ?? 0);

    const [unitsResult] = await db
      .select({ value: countDistinct(schema.taskAssignments.unitId) })
      .from(schema.taskAssignments)
      .where(eq(schema.taskAssignments.status, "ACTIVE"));
    unitsInProgress = Number(unitsResult?.value ?? 0);

    const [warsResult] = await db
      .select({ value: count() })
      .from(schema.workAccomplishedReports)
      .where(eq(schema.workAccomplishedReports.status, "PENDING_REVIEW"));
    warsPendingReview = Number(warsResult?.value ?? 0);

    const [flaggedResult] = await db
      .select({ value: count() })
      .from(schema.dailyProgressEntries)
      .where(eq(schema.dailyProgressEntries.docGapFlagged, true));
    flaggedEntries = Number(flaggedResult?.value ?? 0);

    const rawTasks = await db
      .select({
        unitCode: schema.projectUnits.unitCode,
        subcontractorName: schema.subcontractors.name,
        category: schema.taskAssignments.category,
        workType: schema.taskAssignments.workType,
        startDate: schema.taskAssignments.startDate,
        endDate: schema.taskAssignments.endDate,
        status: schema.taskAssignments.status,
      })
      .from(schema.taskAssignments)
      .leftJoin(schema.projectUnits, eq(schema.taskAssignments.unitId, schema.projectUnits.id))
      .leftJoin(schema.subcontractors, eq(schema.taskAssignments.subconId, schema.subcontractors.id))
      .where(eq(schema.taskAssignments.status, "ACTIVE"))
      .orderBy(desc(schema.taskAssignments.createdAt))
      .limit(25);

    taskRows = rawTasks.map((r) => ({
      unitCode: r.unitCode ?? "—",
      subcontractorName: r.subcontractorName ?? "—",
      category: r.category ?? "—",
      workType: r.workType ?? "—",
      startDate: r.startDate ?? "—",
      endDate: r.endDate ?? "—",
      status: r.status ?? "—",
    }));

    const rawWars = await db
      .select({
        unitCode: schema.projectUnits.unitCode,
        grossAmount: schema.workAccomplishedReports.grossAccomplishment,
        status: schema.workAccomplishedReports.status,
        submittedAt: schema.workAccomplishedReports.submittedAt,
      })
      .from(schema.workAccomplishedReports)
      .leftJoin(schema.projectUnits, eq(schema.workAccomplishedReports.unitId, schema.projectUnits.id))
      .orderBy(desc(schema.workAccomplishedReports.submittedAt))
      .limit(10);

    warRows = rawWars.map((r) => ({
      unitCode: r.unitCode ?? "—",
      grossAmount: r.grossAmount ?? "0",
      status: r.status ?? "—",
      submittedAt: r.submittedAt,
    }));
  } catch {}

  const kpis = [
    { label: "Active NTPs", value: activeNtps },
    { label: "Units In Progress", value: unitsInProgress },
    { label: "WARs Pending Review", value: warsPendingReview },
    { label: "Flagged Progress Entries", value: flaggedEntries },
  ];

  const thStyle: React.CSSProperties = {
    padding: "0.6rem 1rem",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
    color: "#374151",
    borderBottom: "1px solid #f3f4f6",
    whiteSpace: "nowrap",
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              {displayName}
              {deptCode && (
                <span style={{
                  marginLeft: "0.5rem", padding: "0.15rem 0.5rem",
                  background: "#e0e7ff", color: "#3730a3",
                  borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                }}>
                  {deptCode}
                </span>
              )}
            </span>
            <form method="POST" action="/auth/logout" style={{ margin: 0 }}>
              <button
                type="submit"
                style={{
                  padding: "0.4rem 0.85rem", fontSize: "0.8rem",
                  background: "transparent", border: "1px solid #d1d5db",
                  borderRadius: "6px", cursor: "pointer", color: "#374151",
                }}
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </nav>

      <div style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a
            href="/main-dashboard"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              fontSize: "0.875rem", color: "#6b7280", textDecoration: "none",
            }}
          >
            ← Back to Dashboard
          </a>
        </div>

        <header style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{
              margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700,
              borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem",
            }}>
              Construction (Sites)
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
              NTPs · Daily Progress · WAR
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a href="/construction/log-progress" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px",
              background: ACCENT, color: "#fff", fontSize: "0.875rem",
              fontWeight: 600, textDecoration: "none",
            }}>+ Log Progress</a>
            <a href="/construction/submit-war" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px",
              background: "#fff", color: ACCENT, fontSize: "0.875rem",
              fontWeight: 600, textDecoration: "none",
              border: `1px solid ${ACCENT}`,
            }}>Submit WAR</a>
          </div>
        </header>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              borderTop: `3px solid ${ACCENT}`,
            }}>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: 500 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: "1.875rem", fontWeight: 700, color: "#111" }}>
                {kpi.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          marginBottom: "2rem",
          overflow: "hidden",
        }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111" }}>
              Task Assignments
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Unit Code</th>
                  <th style={thStyle}>Subcontractor</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Work Type</th>
                  <th style={thStyle}>Start Date</th>
                  <th style={thStyle}>End Date</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {taskRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{
                      padding: "2.5rem 1rem",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: "0.875rem",
                    }}>
                      No records yet
                    </td>
                  </tr>
                ) : (
                  taskRows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{row.unitCode}</span>
                      </td>
                      <td style={tdStyle}>{row.subcontractorName}</td>
                      <td style={tdStyle}>{row.category}</td>
                      <td style={tdStyle}>{row.workType}</td>
                      <td style={tdStyle}>{row.startDate}</td>
                      <td style={tdStyle}>{row.endDate}</td>
                      <td style={tdStyle}>
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111" }}>
              Work Accomplished Reports
              <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#6b7280", fontWeight: 400 }}>
                (10 most recent)
              </span>
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Unit Code</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Gross Amount</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {warRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{
                      padding: "2.5rem 1rem",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: "0.875rem",
                    }}>
                      No records yet
                    </td>
                  </tr>
                ) : (
                  warRows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{row.unitCode}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 500 }}>
                        PHP {Number(row.grossAmount).toLocaleString()}
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={row.status} />
                      </td>
                      <td style={{ ...tdStyle, color: "#6b7280" }}>
                        {row.submittedAt
                          ? new Date(row.submittedAt).toLocaleString("en-PH", {
                              year: "numeric", month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
