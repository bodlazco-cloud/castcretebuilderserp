export const dynamic = "force-dynamic";

import { db } from "@/db";
import { leaveSchedules, employees } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
    ]);
    return result;
  } catch {
    return fallback;
  }
}

function formatDate(val: string | Date | null | undefined): string {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusBadge(status: string | null) {
  const s = (status ?? "").toUpperCase();
  let bg = "#f3f4f6", color = "#6b7280";
  if (s === "PENDING") { bg = "#fef9c3"; color = "#713f12"; }
  else if (s === "APPROVED") { bg = "#dcfce7"; color = "#166534"; }
  else if (s === "REJECTED") { bg = "#fef2f2"; color = "#b91c1c"; }
  else if (s === "CANCELLED") { bg = "#f3f4f6"; color = "#9ca3af"; }
  return (
    <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: bg, color }}>
      {s || "—"}
    </span>
  );
}

function leaveTypeBadge(leaveType: string | null) {
  const t = (leaveType ?? "").toUpperCase();
  let bg = "#f3f4f6", color = "#6b7280";
  if (t.includes("SICK")) { bg = "#fef2f2"; color = "#b91c1c"; }
  else if (t.includes("VACATION")) { bg = "#eff6ff"; color = "#1e40af"; }
  else if (t.includes("EMERGENCY")) { bg = "#fff7ed"; color = "#9a3412"; }
  else if (t.includes("MATERNITY")) { bg = "#fdf4ff"; color = "#7e22ce"; }
  else if (t.includes("PATERNITY")) { bg = "#f0fdf4"; color = "#166534"; }
  return (
    <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: bg, color }}>
      {leaveType || "—"}
    </span>
  );
}

export default async function LeaveManagementPage() {
  const rows = await safe(
    () =>
      db
        .select({
          id: leaveSchedules.id,
          leaveType: leaveSchedules.leaveType,
          startDate: leaveSchedules.startDate,
          endDate: leaveSchedules.endDate,
          daysCount: leaveSchedules.daysCount,
          status: leaveSchedules.status,
          approvedAt: leaveSchedules.approvedAt,
          createdAt: leaveSchedules.createdAt,
          employeeCode: employees.employeeCode,
          employeeName: employees.fullName,
          position: employees.position,
        })
        .from(leaveSchedules)
        .leftJoin(employees, eq(leaveSchedules.employeeId, employees.id))
        .orderBy(desc(leaveSchedules.startDate))
        .limit(200),
    []
  );

  const totalLeaves = rows.length;
  const pending = rows.filter((r) => r.status === "PENDING").length;
  const approved = rows.filter((r) => r.status === "APPROVED").length;
  const totalDays = rows.reduce((sum, r) => sum + Number(r.daysCount ?? 0), 0);

  const kpis = [
    { label: "Total Leaves", value: totalLeaves, accent: "#7e3af2" },
    { label: "Pending", value: pending, accent: "#e3a008" },
    { label: "Approved", value: approved, accent: "#057a55" },
    { label: "Total Days", value: totalDays, accent: "#1a56db" },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/hr" style={{ fontSize: "0.8rem", color: "#7e3af2", textDecoration: "none", fontWeight: 500 }}>← HR &amp; Payroll</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Leave Management</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Leave applications, balances, and approval workflow.</p>
          </div>
          <a href="/hr/record-leave" style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#7e3af2", color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>+ Record Leave</a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.1rem 1.25rem", borderTop: `3px solid ${kpi.accent}` }}>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 500, marginBottom: "0.35rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "1.7rem", fontWeight: 700, color: kpi.accent }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          {rows.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af", fontSize: "0.95rem" }}>
              No leave records found.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Employee", "Position", "Leave Type", "From", "To", "Days", "Status", "Approved"].map((col) => (
                      <th key={col} style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: "0.78rem", whiteSpace: "nowrap" }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isPending = row.status === "PENDING";
                    return (
                      <tr key={row.id ?? i} style={{ borderBottom: "1px solid #f3f4f6", background: isPending ? "#fffbeb" : undefined }}>
                        <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6b7280" }}>{row.employeeCode ?? "—"}</span>
                          <span style={{ color: "#6b7280", margin: "0 0.25rem" }}> · </span>
                          <span style={{ fontWeight: 500, color: "#111827" }}>{row.employeeName ?? "—"}</span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#9ca3af", fontSize: "0.8rem", whiteSpace: "nowrap" }}>{row.position ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>{leaveTypeBadge(row.leaveType)}</td>
                        <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", color: "#374151" }}>{formatDate(row.startDate)}</td>
                        <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", color: "#374151" }}>{formatDate(row.endDate)}</td>
                        <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", color: "#374151", fontWeight: 500 }}>{row.daysCount ? Number(row.daysCount) : "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>{statusBadge(row.status)}</td>
                        <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap", color: row.approvedAt ? "#374151" : "#9ca3af" }}>{formatDate(row.approvedAt)}</td>
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
