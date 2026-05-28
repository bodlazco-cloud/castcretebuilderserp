export const dynamic = "force-dynamic";

import { db } from "@/db";
import { batchingManpowerLogs, employees } from "@/db/schema";
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

export default async function BatchingManpowerPage() {
  const rows = await safe(
    () =>
      db
        .select({
          id: batchingManpowerLogs.id,
          logDate: batchingManpowerLogs.logDate,
          shift: batchingManpowerLogs.shift,
          hoursWorked: batchingManpowerLogs.hoursWorked,
          overtimeHours: batchingManpowerLogs.overtimeHours,
          employeeId: batchingManpowerLogs.employeeId,
          employeeCode: employees.employeeCode,
          fullName: employees.fullName,
          position: employees.position,
        })
        .from(batchingManpowerLogs)
        .leftJoin(employees, eq(batchingManpowerLogs.employeeId, employees.id))
        .orderBy(desc(batchingManpowerLogs.logDate))
        .limit(200),
    []
  );

  const totalHours = rows.reduce((s, r) => s + Number(r.hoursWorked ?? 0), 0);
  const totalOTHours = rows.reduce((s, r) => s + Number(r.overtimeHours ?? 0), 0);
  const uniqueEmployees = new Set(rows.map((r) => r.employeeId)).size;

  const accent = "#0e9f6e";

  const fmtDate = (d: string | Date | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const shiftBadge = (shift: string | null) => {
    if (!shift) return <span style={{ color: "#d1d5db" }}>—</span>;
    const s = shift.toUpperCase();
    const map: Record<string, { bg: string; color: string }> = {
      AM: { bg: "#fef3c7", color: "#92400e" },
      PM: { bg: "#dbeafe", color: "#1e40af" },
      NIGHT: { bg: "#1e1b4b", color: "#c7d2fe" },
    };
    const style = map[s] ?? { bg: "#f3f4f6", color: "#374151" };
    return (
      <span
        style={{
          padding: "0.2rem 0.55rem",
          borderRadius: "4px",
          fontSize: "0.72rem",
          fontWeight: 700,
          background: style.bg,
          color: style.color,
          letterSpacing: "0.04em",
        }}
      >
        {s}
      </span>
    );
  };

  const kpiCard = (label: string, value: string) => (
    <div
      style={{
        flex: "1 1 0",
        minWidth: "150px",
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        padding: "1.1rem 1.25rem",
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</div>
    </div>
  );

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/batching" style={{ fontSize: "0.8rem", color: accent, textDecoration: "none" }}>← Batching</a>
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Plant Manpower</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Batching plant employee shift and hours log.</p>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {kpiCard("Total Logs", String(rows.length))}
          {kpiCard("Total Hours", totalHours.toFixed(1))}
          {kpiCard("Total OT Hours", totalOTHours.toFixed(1))}
          {kpiCard("Unique Employees", String(uniqueEmployees))}
        </div>

        {rows.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              padding: "3rem",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: "0.95rem",
            }}
          >
            No manpower logs found.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.855rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Date", "Employee", "Position", "Shift", "Hours", "OT Hours"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.7rem 0.9rem",
                        textAlign: "left",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ot = Number(r.overtimeHours ?? 0);
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.7rem 0.9rem", whiteSpace: "nowrap", color: "#374151" }}>
                        {fmtDate(r.logDate)}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: accent, fontWeight: 600 }}>
                          {r.employeeCode ?? "—"}
                        </span>
                        {r.fullName && (
                          <span style={{ color: "#374151" }}> · {r.fullName}</span>
                        )}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                        {r.position ?? "—"}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem" }}>
                        {shiftBadge(r.shift)}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>
                        {Number(r.hoursWorked ?? 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", fontWeight: 600, whiteSpace: "nowrap", color: ot > 0 ? "#dc2626" : "#9ca3af" }}>
                        {ot > 0 ? ot.toFixed(2) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
