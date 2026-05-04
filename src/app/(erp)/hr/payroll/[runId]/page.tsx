export const dynamic = "force-dynamic";
import type React from "react";
import { db } from "@/db";
import { payrollRuns, payrollLineItems, employees, costCenters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/supabase-server";
import ApproveButton from "./ApproveButton";

const ACCENT = "#7c3aed";

const fmtPhp = (v: string | null) =>
  v != null
    ? `₱ ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
    : "—";

export default async function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  await getAuthUser();
  const { runId } = await params;

  const [run] = await db
    .select({
      id:              payrollRuns.id,
      periodStart:     payrollRuns.periodStart,
      periodEnd:       payrollRuns.periodEnd,
      status:          payrollRuns.status,
      totalGross:      payrollRuns.totalGross,
      totalDeductions: payrollRuns.totalDeductions,
      totalNet:        payrollRuns.totalNet,
      dtrVerified:     payrollRuns.dtrVerified,
    })
    .from(payrollRuns)
    .where(eq(payrollRuns.id, runId))
    .limit(1);

  if (!run) notFound();

  const lineItems = await db
    .select({
      id:                  payrollLineItems.id,
      employeeName:        employees.fullName,
      employeeCode:        employees.employeeCode,
      costCenterCode:      costCenters.code,
      costCenterName:      costCenters.name,
      daysWorked:          payrollLineItems.daysWorked,
      overtimeHours:       payrollLineItems.overtimeHours,
      grossPay:             payrollLineItems.grossPay,
      sssRegularDeduction:  payrollLineItems.sssRegularDeduction,
      sssMpfDeduction:      payrollLineItems.sssMpfDeduction,
      philhealthDeduction:  payrollLineItems.philhealthDeduction,
      pagibigDeduction:    payrollLineItems.pagibigDeduction,
      taxWithheld:         payrollLineItems.taxWithheld,
      otherDeductions:     payrollLineItems.otherDeductions,
      netPay:              payrollLineItems.netPay,
    })
    .from(payrollLineItems)
    .innerJoin(employees,    eq(payrollLineItems.employeeId,   employees.id))
    .innerJoin(costCenters,  eq(payrollLineItems.costCenterId, costCenters.id))
    .where(eq(payrollLineItems.payrollRunId, runId))
    .orderBy(employees.fullName);

  const thStyle: React.CSSProperties = {
    padding: "0.65rem 1rem", fontWeight: 600, color: "#374151",
    borderBottom: "1px solid #e5e7eb", fontSize: "0.75rem",
    textTransform: "uppercase" as const, letterSpacing: "0.04em", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.7rem 1rem", fontSize: "0.875rem", borderBottom: "1px solid #f3f4f6",
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/hr/payroll" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Payroll Runs
          </a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>
              Payroll Run — {run.periodStart} to {run.periodEnd}
            </h1>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.875rem", color: "#6b7280" }}>
              <span>Status: <strong style={{ color: "#111827" }}>{run.status}</strong></span>
              <span>DTR: <strong style={{ color: run.dtrVerified ? "#166534" : "#d97706" }}>
                {run.dtrVerified ? "✓ Verified" : "⚠ Unverified"}
              </strong></span>
              <span>{lineItems.length} employees</span>
            </div>
          </div>

          {/* Run totals */}
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {run.status === "DRAFT" && <ApproveButton runId={run.id} />}
            {[
              { label: "Gross", value: fmtPhp(run.totalGross) },
              { label: "Deductions", value: run.totalDeductions ? `(${fmtPhp(run.totalDeductions)})` : "—", red: true },
              { label: "Net Pay", value: fmtPhp(run.totalNet), bold: true },
            ].map(({ label, value, red, bold }) => (
              <div key={label} style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 0.15rem", fontSize: "0.72rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
                <p style={{ margin: 0, fontFamily: "monospace", fontWeight: bold ? 700 : 500, color: red ? "#dc2626" : "#111827" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {!run.dtrVerified && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "0.75rem",
            padding: "0.9rem 1.1rem", marginBottom: "1.5rem",
            background: "#fffbeb", borderLeft: "4px solid #f59e0b",
          }}>
            <span style={{ fontSize: "1rem" }}>⚠</span>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#92400e" }}>
              This payroll run was not validated against site logs (batching / fleet manpower logs).
              Confirm DTR entries with site supervisors before releasing.
            </p>
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ ...thStyle, textAlign: "left" }}>Employee</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Cost Center</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Days</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>OT Hrs</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Gross Pay</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Deductions</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Net Pay</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af" }}>
                      No line items found.
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item) => {
                    const totalDeductions =
                      Number(item.sssRegularDeduction) + Number(item.sssMpfDeduction) +
                      Number(item.philhealthDeduction) + Number(item.pagibigDeduction) +
                      Number(item.taxWithheld) + Number(item.otherDeductions);

                    return (
                      <tr key={item.id}>
                        <td style={{ ...tdStyle }}>
                          <span style={{ fontWeight: 600, color: "#111827" }}>{item.employeeName}</span>
                          <span style={{ display: "block", fontSize: "0.72rem", color: "#6b7280", fontFamily: "monospace" }}>{item.employeeCode}</span>
                        </td>
                        <td style={{ ...tdStyle }}>
                          <span style={{ fontSize: "0.75rem", fontFamily: "monospace", background: "#eff6ff", padding: "0.15rem 0.45rem", borderRadius: "4px", color: "#1d4ed8" }}>
                            {item.costCenterCode}
                          </span>
                          <span style={{ display: "block", fontSize: "0.72rem", color: "#6b7280", marginTop: "0.1rem" }}>{item.costCenterName}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>{Number(item.daysWorked).toFixed(1)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>
                          {Number(item.overtimeHours) > 0 ? Number(item.overtimeHours).toFixed(1) : "—"}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>{fmtPhp(item.grossPay)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", color: "#dc2626" }}>
                          ({fmtPhp(String(totalDeductions.toFixed(2)))})
                          <span style={{ display: "block", fontSize: "0.65rem", color: "#9ca3af" }}>
                            SSS·MPF·PhilHealth·Pag-IBIG·Tax
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtPhp(item.netPay)}</td>
                        <td style={{ ...tdStyle }}>
                          <span style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: "#f0fdf4", color: "#166534" }}>
                            Computed
                          </span>
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
