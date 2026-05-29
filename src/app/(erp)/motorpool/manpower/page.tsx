export const dynamic = "force-dynamic";

import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import { fleetManpowerLogs, employees, equipment, departments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { LogManpowerForm } from "./LogManpowerForm";

const fmtDate = (d: string | Date | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default async function MotorpoolManpowerPage() {
  const user = await getAuthUser();

  // Get Motorpool dept id
  const [motorpoolDept] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.code, "MOTORPOOL"))
    .limit(1);

  // Fetch employees assigned to Motorpool dept (from HR)
  const motorpoolEmployees = motorpoolDept
    ? await db
        .select({
          id:           employees.id,
          employeeCode: employees.employeeCode,
          fullName:     employees.fullName,
          position:     employees.position,
          costCenterId: employees.costCenterId,
        })
        .from(employees)
        .where(eq(employees.deptId, motorpoolDept.id))
        .orderBy(employees.fullName)
    : [];

  const [equipmentList, rows] = await Promise.all([
    db.select({ id: equipment.id, code: equipment.code, name: equipment.name })
      .from(equipment).orderBy(equipment.code),

    db.select({
      id:            fleetManpowerLogs.id,
      logDate:       fleetManpowerLogs.logDate,
      hoursWorked:   fleetManpowerLogs.hoursWorked,
      overtimeHours: fleetManpowerLogs.overtimeHours,
      employeeCode:  employees.employeeCode,
      employeeName:  employees.fullName,
      position:      employees.position,
      equipCode:     equipment.code,
      equipName:     equipment.name,
    })
      .from(fleetManpowerLogs)
      .leftJoin(employees, eq(fleetManpowerLogs.employeeId, employees.id))
      .leftJoin(equipment, eq(fleetManpowerLogs.equipmentId, equipment.id))
      .orderBy(desc(fleetManpowerLogs.logDate))
      .limit(200),
  ]);

  const totalHours      = rows.reduce((s, r) => s + Number(r.hoursWorked ?? 0), 0);
  const totalOT         = rows.reduce((s, r) => s + Number(r.overtimeHours ?? 0), 0);
  const uniqueOperators = new Set(rows.map((r) => r.employeeCode).filter(Boolean)).size;

  const kpis = [
    { label: "Total Logs",       value: String(rows.length),          accent: "#0694a2" },
    { label: "Total Hours",      value: `${totalHours.toFixed(1)} hrs`, accent: "#1a56db" },
    { label: "Total OT",         value: `${totalOT.toFixed(1)} hrs`,  accent: "#dc2626" },
    { label: "Unique Operators", value: String(uniqueOperators),       accent: "#7e3af2" },
  ];

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <a href="/motorpool" style={{ fontSize: "13px", color: "#0694a2", textDecoration: "none", fontWeight: 500 }}>
            ← Motorpool
          </a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 700, color: "#111827" }}>Fleet Manpower</h1>
            <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
              Operator hours per equipment — employees sourced from HR &amp; Payroll (Motorpool dept)
            </p>
          </div>
          <LogManpowerForm
            employees={motorpoolEmployees}
            equipmentList={equipmentList}
            userId={user?.id ?? ""}
          />
        </div>

        {motorpoolEmployees.length === 0 && (
          <div style={{ marginBottom: "1.5rem", padding: "0.85rem 1rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "0.82rem", color: "#92400e" }}>
            <strong>No Motorpool employees found.</strong> Go to{" "}
            <a href="/hr/registry" style={{ color: "#1a56db" }}>HR &amp; Payroll → Employee Registry</a>{" "}
            and assign employees to the Motorpool department to log their hours here.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `4px solid ${k.accent}` }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>{k.label}</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#111827" }}>Manpower Logs</h2>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: "48px 16px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
              No manpower logs yet. Use the Log Manpower button above.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Date", "Employee", "Position", "Equipment", "Hours", "OT Hours"].map((h, i) => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: i >= 4 ? "right" : "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const ot = Number(r.overtimeHours ?? 0);
                    return (
                      <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <td style={{ padding: "13px 16px", color: "#374151", whiteSpace: "nowrap" }}>{fmtDate(r.logDate)}</td>
                        <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#0694a2", fontWeight: 700 }}>{r.employeeCode ?? "—"}</span>
                          {r.employeeName && <span style={{ color: "#374151" }}> · {r.employeeName}</span>}
                        </td>
                        <td style={{ padding: "13px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>{r.position ?? "—"}</td>
                        <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                          {r.equipCode
                            ? <><span style={{ fontFamily: "monospace", fontSize: "12px", color: "#0694a2", fontWeight: 700 }}>{r.equipCode}</span>{r.equipName && <span style={{ color: "#374151" }}> · {r.equipName}</span>}</>
                            : <span style={{ color: "#d1d5db" }}>General</span>}
                        </td>
                        <td style={{ padding: "13px 16px", textAlign: "right", fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>
                          {Number(r.hoursWorked ?? 0).toFixed(1)}
                        </td>
                        <td style={{ padding: "13px 16px", textAlign: "right", fontWeight: 600, whiteSpace: "nowrap", color: ot > 0 ? "#dc2626" : "#9ca3af" }}>
                          {ot > 0 ? ot.toFixed(1) : "—"}
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
