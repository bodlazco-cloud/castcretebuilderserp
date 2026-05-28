export const dynamic = "force-dynamic";

import { db } from "@/db";
import { fleetManpowerLogs, employees, equipment } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
    ]);
  } catch {
    return fallback;
  }
}

const fmtDate = (d: string | Date | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default async function MotorpoolManpowerPage() {
  const rows = await safe(
    () =>
      db
        .select({
          id: fleetManpowerLogs.id,
          logDate: fleetManpowerLogs.logDate,
          hoursWorked: fleetManpowerLogs.hoursWorked,
          overtimeHours: fleetManpowerLogs.overtimeHours,
          employeeCode: employees.employeeCode,
          employeeName: employees.fullName,
          position: employees.position,
          equipCode: equipment.code,
          equipName: equipment.name,
        })
        .from(fleetManpowerLogs)
        .leftJoin(employees, eq(fleetManpowerLogs.employeeId, employees.id))
        .leftJoin(equipment, eq(fleetManpowerLogs.equipmentId, equipment.id))
        .orderBy(desc(fleetManpowerLogs.logDate))
        .limit(200),
    []
  );

  const totalHours = rows.reduce((s, r) => s + Number(r.hoursWorked ?? 0), 0);
  const totalOT = rows.reduce((s, r) => s + Number(r.overtimeHours ?? 0), 0);
  const uniqueOperators = new Set(rows.map((r) => r.employeeCode).filter(Boolean));
  const uniqueEquipment = new Set(rows.map((r) => r.equipCode).filter(Boolean));

  const kpis = [
    { label: "Total Logs", value: String(rows.length), accent: "#0694a2" },
    { label: "Total Hours", value: `${totalHours.toFixed(1)} hrs`, accent: "#1a56db" },
    { label: "Total OT", value: `${totalOT.toFixed(1)} hrs`, accent: "#dc2626" },
    { label: "Unique Operators", value: String(uniqueOperators.size), accent: "#7e3af2" },
  ];

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <a href="/motorpool" style={{ fontSize: "13px", color: "#0694a2", textDecoration: "none", fontWeight: 500 }}>
            ← Motorpool
          </a>
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: "26px", fontWeight: 700, color: "#111827" }}>Fleet Manpower</h1>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#6b7280" }}>
          Fleet manpower logs — operator hours per equipment.
        </p>

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
              No manpower logs found.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Date</th>
                    <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Employee</th>
                    <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Position</th>
                    <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Equipment</th>
                    <th style={{ padding: "11px 16px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Hours</th>
                    <th style={{ padding: "11px 16px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>OT Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const ot = Number(r.overtimeHours ?? 0);
                    const hasEquip = r.equipCode || r.equipName;
                    return (
                      <tr key={r.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid #f3f4f6" : "none", verticalAlign: "middle" }}>
                        <td style={{ padding: "13px 16px", color: "#374151", whiteSpace: "nowrap" }}>{fmtDate(r.logDate)}</td>
                        <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#0694a2", fontWeight: 700 }}>
                            {r.employeeCode ?? "—"}
                          </span>
                          {r.employeeName && (
                            <span style={{ color: "#374151" }}> · {r.employeeName}</span>
                          )}
                        </td>
                        <td style={{ padding: "13px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>{r.position ?? "—"}</td>
                        <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                          {hasEquip ? (
                            <span>
                              <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#0694a2", fontWeight: 700 }}>
                                {r.equipCode}
                              </span>
                              {r.equipName && (
                                <span style={{ color: "#374151" }}> · {r.equipName}</span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: "#d1d5db" }}>—</span>
                          )}
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
