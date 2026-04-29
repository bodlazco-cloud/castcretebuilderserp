import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, gte, count } from "drizzle-orm";

export default async function HRPage() {
  const user = await getAuthUser();
  const deptCode: string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [activeEmpRows, pendingLeaveRows, unverifiedDtrRows, pendingPayrollRows] = await Promise.all([
    db.select({ value: count() }).from(schema.employees).where(eq(schema.employees.isActive, true)),
    db.select({ value: count() }).from(schema.leaveSchedules).where(eq(schema.leaveSchedules.status, "PENDING")),
    db
      .select({ value: count() })
      .from(schema.dailyTimeRecords)
      .where(and(eq(schema.dailyTimeRecords.isVerified, false), gte(schema.dailyTimeRecords.workDate, monthStart))),
    db.select({ value: count() }).from(schema.payrollRecords).where(eq(schema.payrollRecords.status, "DRAFT")),
  ]);

  const activeEmployees = activeEmpRows[0]?.value ?? 0;
  const pendingLeaves = pendingLeaveRows[0]?.value ?? 0;
  const unverifiedDtr = unverifiedDtrRows[0]?.value ?? 0;
  const pendingPayroll = pendingPayrollRows[0]?.value ?? 0;

  const employeeRows = await db
    .select({
      employeeCode: schema.employees.employeeCode,
      fullName: schema.employees.fullName,
      deptName: schema.departments.name,
      position: schema.employees.position,
      employmentType: schema.employees.employmentType,
      dailyRate: schema.employees.dailyRate,
      isActive: schema.employees.isActive,
    })
    .from(schema.employees)
    .leftJoin(schema.departments, eq(schema.employees.deptId, schema.departments.id))
    .orderBy(schema.employees.fullName)
    .limit(20);

  const leaveRows = await db
    .select({
      fullName: schema.employees.fullName,
      leaveType: schema.leaveSchedules.leaveType,
      startDate: schema.leaveSchedules.startDate,
      endDate: schema.leaveSchedules.endDate,
      daysCount: schema.leaveSchedules.daysCount,
      status: schema.leaveSchedules.status,
      createdAt: schema.leaveSchedules.createdAt,
    })
    .from(schema.leaveSchedules)
    .leftJoin(schema.employees, eq(schema.leaveSchedules.employeeId, schema.employees.id))
    .where(eq(schema.leaveSchedules.status, "PENDING"))
    .orderBy(schema.leaveSchedules.createdAt)
    .limit(10);

  const ACCENT = "#6b7280";

  const kpis = [
    { label: "Active Employees", value: String(activeEmployees) },
    { label: "Pending Leave Requests", value: String(pendingLeaves) },
    { label: "Unverified DTR (This Month)", value: String(unverifiedDtr) },
    { label: "Pending Payroll", value: String(pendingPayroll) },
  ];

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
              <button type="submit" style={{
                padding: "0.4rem 0.85rem", fontSize: "0.8rem",
                background: "transparent", border: "1px solid #d1d5db",
                borderRadius: "6px", cursor: "pointer", color: "#374151",
              }}>
                Sign out
              </button>
            </form>
          </div>
        )}
      </nav>

      <div style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/dashboard" style={{ fontSize: "0.875rem", color: "#1a56db", textDecoration: "none" }}>
            ← Back to Dashboard
          </a>
        </div>

        <header style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
              HR &amp; Payroll
            </h1>
            <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.9rem" }}>
              Employees · DTR · Leave · Payroll
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <a href="/hr/add-employee" style={{
              padding: "0.55rem 1rem", borderRadius: "6px",
              background: "#374151", color: "#fff", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
            }}>+ Add Employee</a>
            <a href="/hr/log-dtr" style={{
              padding: "0.55rem 1rem", borderRadius: "6px",
              background: "#374151", color: "#fff", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
            }}>+ Log DTR</a>
            <a href="/hr/record-leave" style={{
              padding: "0.55rem 1rem", borderRadius: "6px",
              background: "#fff", color: "#374151", fontSize: "0.82rem", fontWeight: 600,
              textDecoration: "none", border: "1px solid #d1d5db",
            }}>Record Leave</a>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{
              background: "#fff", borderRadius: "8px", padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${ACCENT}`,
            }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111" }}>{k.value}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "2rem", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Employees</h2>
          </div>
          {employeeRows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No records yet</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Code", "Full Name", "Department", "Position", "Employment Type", "Daily Rate", "Status"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employeeRows.map((row, i) => (
                    <tr key={row.employeeCode} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", whiteSpace: "nowrap" }}>{row.employeeCode}</td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.fullName}</td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.deptName ?? "—"}</td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.position}</td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.employmentType}</td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                        PHP {Number(row.dailyRate).toLocaleString()}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{
                          padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                          background: row.isActive ? "#d1fae5" : "#f3f4f6",
                          color: row.isActive ? "#065f46" : "#6b7280",
                        }}>
                          {row.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Pending Leave Requests</h2>
          </div>
          {leaveRows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No records yet</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Employee", "Leave Type", "Start Date", "End Date", "Days", "Status"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaveRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.fullName ?? "—"}</td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.leaveType}</td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.startDate}</td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.endDate}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{row.daysCount ?? "—"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{
                          padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                          background: "#fef3c7", color: "#92400e",
                        }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
