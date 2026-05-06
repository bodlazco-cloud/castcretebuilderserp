export const dynamic = "force-dynamic";
import { db } from "@/db";
import { payrollRecords, employees } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { RunPayrollForm } from "./RunPayrollForm";
import { PayrollActions } from "./PayrollActions";

const ACCENT = "#6b7280";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  DRAFT:      { bg: "#f3f4f6", color: "#374151" },
  PROCESSING: { bg: "#eff6ff", color: "#1a56db" },
  APPROVED:   { bg: "#f0fdf4", color: "#057a55" },
  RELEASED:   { bg: "#dcfce7", color: "#166534" },
};

export default async function PayrollPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:           payrollRecords.id,
      periodStart:  payrollRecords.periodStart,
      periodEnd:    payrollRecords.periodEnd,
      daysWorked:   payrollRecords.daysWorked,
      overtimeHours: payrollRecords.overtimeHours,
      grossPay:     payrollRecords.grossPay,
      sssDeduction: payrollRecords.sssDeduction,
      phDeduction:  payrollRecords.philhealthDeduction,
      pagibig:      payrollRecords.pagibigDeduction,
      otherDeductions: payrollRecords.otherDeductions,
      netPay:       payrollRecords.netPay,
      status:       payrollRecords.status,
      approvedAt:   payrollRecords.approvedAt,
      paidAt:       payrollRecords.paidAt,
      fullName:     employees.fullName,
      empCode:      employees.employeeCode,
    })
    .from(payrollRecords)
    .leftJoin(employees, eq(payrollRecords.employeeId, employees.id))
    .orderBy(desc(payrollRecords.periodEnd), employees.fullName)
    .limit(200);

  const fmt = (v: string | null) =>
    v ? `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";

  const totalNet = rows.reduce((s, r) => s + Number(r.netPay), 0);
  const draftCount = rows.filter((r) => r.status === "DRAFT").length;
  const releasedCount = rows.filter((r) => r.status === "RELEASED").length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/hr" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← HR & Payroll</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Payroll</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {rows.length} records · {draftCount} pending approval · {releasedCount} released
            </p>
          </div>
          <RunPayrollForm />
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Total Net Pay (All)", value: `PHP ${totalNet.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` },
            { label: "Draft Records", value: String(draftCount) },
            { label: "Released Records", value: String(releasedCount) },
            { label: "Total Records", value: String(rows.length) },
          ].map((k) => (
            <div key={k.label} style={{
              background: "#fff", borderRadius: "8px", padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${ACCENT}`,
            }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111" }}>{k.value}</div>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.25rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No payroll records yet. Run payroll to generate records from DTR data.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Employee", "Period", "Days", "OT Hrs", "Gross Pay", "Deductions", "Net Pay", "Status", "Actions"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: [4,5,6].includes(i) ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.DRAFT;
                    const totalDeductions =
                      Number(r.sssDeduction) + Number(r.phDeduction) +
                      Number(r.pagibig) + Number(r.otherDeductions);
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <div style={{ fontWeight: 500, color: "#111827" }}>{r.fullName ?? "—"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace" }}>{r.empCode ?? ""}</div>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                          {r.periodStart} → {r.periodEnd}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", textAlign: "right" }}>
                          {Number(r.daysWorked).toFixed(1)}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", textAlign: "right" }}>
                          {Number(r.overtimeHours).toFixed(1)}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
                          {fmt(r.grossPay)}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "#b91c1c", whiteSpace: "nowrap" }}>
                          −PHP {totalDeductions.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 700, color: "#057a55", whiteSpace: "nowrap" }}>
                          {fmt(r.netPay)}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: sc.bg, color: sc.color, whiteSpace: "nowrap" }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <PayrollActions id={r.id} status={r.status} />
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
