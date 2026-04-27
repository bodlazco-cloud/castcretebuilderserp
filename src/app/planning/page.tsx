import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, ne, desc, count, and } from "drizzle-orm";

export default async function PlanningPage() {
  let user = null;
  try {
    user = await getAuthUser();
  } catch {}

  const deptCode: string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";

  const [
    activeProjectsResult,
    registeredSubcontractorsResult,
    bomStandardsResult,
    activityDefinitionsResult,
    subcontractorRows,
    projectRows,
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(schema.projects)
      .where(eq(schema.projects.status, "ACTIVE")),
    db
      .select({ value: count() })
      .from(schema.subcontractors)
      .where(eq(schema.subcontractors.isActive, true)),
    db
      .select({ value: count() })
      .from(schema.bomStandards)
      .where(eq(schema.bomStandards.isActive, true)),
    db
      .select({ value: count() })
      .from(schema.activityDefinitions)
      .where(eq(schema.activityDefinitions.isActive, true)),
    db
      .select({
        id: schema.subcontractors.id,
        code: schema.subcontractors.code,
        name: schema.subcontractors.name,
        tradeTypes: schema.subcontractors.tradeTypes,
        performanceGrade: schema.subcontractors.performanceGrade,
        performanceScore: schema.subcontractors.performanceScore,
        stopAssignment: schema.subcontractors.stopAssignment,
        isActive: schema.subcontractors.isActive,
      })
      .from(schema.subcontractors)
      .orderBy(desc(schema.subcontractors.performanceScore))
      .limit(20),
    db
      .select({
        projectId: schema.projects.id,
        projectName: schema.projects.name,
        developerName: schema.developers.name,
        contractValue: schema.projects.contractValue,
        status: schema.projects.status,
        startDate: schema.projects.startDate,
      })
      .from(schema.projects)
      .leftJoin(schema.developers, eq(schema.projects.developerId, schema.developers.id))
      .orderBy(desc(schema.projects.createdAt)),
  ]);

  const activeProjects = Number(activeProjectsResult[0]?.value ?? 0);
  const registeredSubcontractors = Number(registeredSubcontractorsResult[0]?.value ?? 0);
  const bomStandards = Number(bomStandardsResult[0]?.value ?? 0);
  const activityDefinitions = Number(activityDefinitionsResult[0]?.value ?? 0);

  const accent = "#1a56db";

  const kpis = [
    { label: "Active Projects", value: activeProjects },
    { label: "Registered Subcontractors", value: registeredSubcontractors },
    { label: "BOM Standards", value: bomStandards },
    { label: "Activity Definitions", value: activityDefinitions },
  ];

  const gradeColors: Record<string, string> = {
    A: "#057a55",
    B: "#e3a008",
    C: "#e02424",
  };

  const thStyle: React.CSSProperties = {
    padding: "0.65rem 1rem",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "0.65rem 1rem",
    fontSize: "0.875rem",
    color: "#111827",
    borderBottom: "1px solid #f3f4f6",
    whiteSpace: "nowrap",
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        height: "56px",
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
          <span style={{
            padding: "0.15rem 0.6rem",
            background: "#eff6ff",
            color: accent,
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}>
            Planning & Engineering
          </span>
        </div>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              {displayName}
              {deptCode && (
                <span style={{
                  marginLeft: "0.5rem",
                  padding: "0.15rem 0.5rem",
                  background: "#e0e7ff",
                  color: "#3730a3",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}>
                  {deptCode}
                </span>
              )}
            </span>
            <form method="POST" action="/auth/logout" style={{ margin: 0 }}>
              <button
                type="submit"
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.8rem",
                  background: "transparent",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "#374151",
                }}
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </nav>

      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.75rem" }}>
          <a
            href="/dashboard"
            style={{
              fontSize: "0.85rem",
              color: accent,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            ← Back to Dashboard
          </a>
        </div>

        <header style={{ marginBottom: "2rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
            Planning & Engineering
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            BOM Standards · Resource Forecast · Schedule
          </p>
        </header>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}>
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: "#fff",
                borderRadius: "8px",
                padding: "1.25rem 1.5rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                borderTop: `3px solid ${accent}`,
              }}
            >
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                {kpi.value.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.4rem" }}>
                {kpi.label}
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
          <div style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <span style={{
              width: "4px",
              height: "18px",
              background: accent,
              borderRadius: "2px",
              display: "inline-block",
            }} />
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
              Subcontractors
            </h2>
            <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#9ca3af" }}>
              Top 20 by performance score
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Code</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Trade Types</th>
                  <th style={thStyle}>Performance Grade</th>
                  <th style={thStyle}>Performance Score</th>
                  <th style={thStyle}>Stop Assignment</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {subcontractorRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af", padding: "2rem" }}>
                      No records yet
                    </td>
                  </tr>
                ) : (
                  subcontractorRows.map((row) => (
                    <tr key={row.id} style={{ transition: "background 0.1s" }}>
                      <td style={{ ...tdStyle, fontFamily: "monospace", color: "#374151" }}>{row.code}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{row.name}</td>
                      <td style={{ ...tdStyle, color: "#6b7280" }}>
                        {(row.tradeTypes ?? []).join(", ")}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: "0.2rem 0.55rem",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: `${gradeColors[row.performanceGrade] ?? "#6b7280"}22`,
                          color: gradeColors[row.performanceGrade] ?? "#6b7280",
                        }}>
                          {row.performanceGrade}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {Number(row.performanceScore).toFixed(2)}
                      </td>
                      <td style={tdStyle}>
                        {row.stopAssignment ? (
                          <span style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: "#fef2f2",
                            color: "#e02424",
                          }}>
                            STOP
                          </span>
                        ) : (
                          <span style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: "#f0fdf4",
                            color: "#057a55",
                          }}>
                            OK
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {row.isActive ? (
                          <span style={{ color: "#057a55", fontWeight: 500, fontSize: "0.8rem" }}>Active</span>
                        ) : (
                          <span style={{ color: "#9ca3af", fontWeight: 500, fontSize: "0.8rem" }}>Inactive</span>
                        )}
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
          <div style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}>
            <span style={{
              width: "4px",
              height: "18px",
              background: accent,
              borderRadius: "2px",
              display: "inline-block",
            }} />
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
              Projects
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Project Name</th>
                  <th style={thStyle}>Developer</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Contract Value</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Start Date</th>
                </tr>
              </thead>
              <tbody>
                {projectRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "#9ca3af", padding: "2rem" }}>
                      No records yet
                    </td>
                  </tr>
                ) : (
                  projectRows.map((row) => {
                    const statusColors: Record<string, { bg: string; text: string }> = {
                      ACTIVE:   { bg: "#f0fdf4", text: "#057a55" },
                      BIDDING:  { bg: "#eff6ff", text: "#1a56db" },
                      COMPLETED:{ bg: "#f9fafb", text: "#6b7280" },
                      ON_HOLD:  { bg: "#fffbeb", text: "#e3a008" },
                    };
                    const sc = statusColors[row.status] ?? { bg: "#f3f4f6", text: "#6b7280" };
                    return (
                      <tr key={row.projectId}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{row.projectName}</td>
                        <td style={{ ...tdStyle, color: "#6b7280" }}>{row.developerName ?? "—"}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>
                          PHP {Number(row.contractValue).toLocaleString()}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: sc.bg,
                            color: sc.text,
                          }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: "#6b7280" }}>
                          {row.startDate ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
