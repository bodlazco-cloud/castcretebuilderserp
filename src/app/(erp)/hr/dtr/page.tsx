export const dynamic = "force-dynamic";

import { db } from "@/db";
import { dailyTimeRecords, employees } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function DtrPage() {
  const rows = await safe(
    db
      .select({
        id: dailyTimeRecords.id,
        workDate: dailyTimeRecords.workDate,
        timeIn: dailyTimeRecords.timeIn,
        timeOut: dailyTimeRecords.timeOut,
        hoursWorked: dailyTimeRecords.hoursWorked,
        overtimeHours: dailyTimeRecords.overtimeHours,
        isVerified: dailyTimeRecords.isVerified,
        fileUrl: dailyTimeRecords.fileUrl,
        employeeCode: employees.employeeCode,
        employeeName: employees.fullName,
        position: employees.position,
      })
      .from(dailyTimeRecords)
      .leftJoin(employees, eq(dailyTimeRecords.employeeId, employees.id))
      .orderBy(desc(dailyTimeRecords.workDate))
      .limit(200),
    []
  );

  const totalRecords = rows.length;
  const verified = rows.filter((r) => r.isVerified).length;
  const unverified = rows.filter((r) => !r.isVerified).length;
  const totalOtHours = rows.reduce((sum, r) => sum + Number(r.overtimeHours ?? 0), 0);

  const kpis = [
    { label: "Total Records", value: String(totalRecords), accent: "#7e3af2" },
    { label: "Verified", value: String(verified), accent: "#057a55" },
    { label: "Unverified", value: String(unverified), accent: "#e3a008" },
    { label: "Total OT Hours", value: `${totalOtHours.toFixed(1)} hrs`, accent: "#dc2626" },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/hr" style={{ fontSize: "0.8rem", color: "#7e3af2", textDecoration: "none" }}>← HR & Payroll</a>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Daily Time Records</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Upload, review, and manage employee attendance records.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          {rows.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
              <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No records found</div>
              <div style={{ fontSize: "0.875rem" }}>Daily time records will appear here once entries are added.</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Date", "Employee", "Position", "Time In", "Time Out", "Hours", "OT Hrs", "Verified", "Doc"].map((col) => (
                      <th key={col} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const otHours = Number(r.overtimeHours ?? 0);
                    const isUnverified = !r.isVerified;
                    return (
                      <tr
                        key={r.id}
                        style={{
                          background: isUnverified ? "#fffbeb" : i % 2 === 0 ? "#fff" : "#fafafa",
                          borderBottom: "1px solid #f3f4f6",
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", color: "#111827" }}>
                          {formatDate(r.workDate)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#7e3af2", fontWeight: 600 }}>{r.employeeCode ?? "—"}</span>
                          <span style={{ color: "#6b7280" }}> · </span>
                          <span style={{ color: "#111827" }}>{r.employeeName ?? "—"}</span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#6b7280", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                          {r.position ?? "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#374151", whiteSpace: "nowrap" }}>
                          {r.timeIn ?? "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#374151", whiteSpace: "nowrap" }}>
                          {r.timeOut ?? "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>
                          {Number(r.hoursWorked ?? 0).toFixed(1)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: otHours > 0 ? "#dc2626" : "#6b7280", fontWeight: otHours > 0 ? 600 : 400, whiteSpace: "nowrap" }}>
                          {otHours.toFixed(1)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                          {r.isVerified ? (
                            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "9999px", background: "#d1fae5", color: "#065f46", fontSize: "0.75rem", fontWeight: 600 }}>✓ Verified</span>
                          ) : (
                            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "9999px", background: "#fef9c3", color: "#92400e", fontSize: "0.75rem", fontWeight: 600 }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          {r.fileUrl ? (
                            <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", fontSize: "1.1rem" }}>📎</a>
                          ) : (
                            <span style={{ color: "#d1d5db" }}>—</span>
                          )}
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
