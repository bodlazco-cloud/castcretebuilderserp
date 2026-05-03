export const dynamic = "force-dynamic";
import { db } from "@/db";
import { payrollRuns, departments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { ProcessRunForm } from "./ProcessRunForm";

const ACCENT = "#7c3aed";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:      { bg: "#f3f4f6", color: "#374151" },
  PROCESSING: { bg: "#eff6ff", color: "#1d4ed8" },
  APPROVED:   { bg: "#f0fdf4", color: "#166534" },
  RELEASED:   { bg: "#dcfce7", color: "#14532d" },
};

const fmtPhp = (v: string | null) =>
  v != null
    ? `₱ ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
    : "—";

export default async function PayrollPage() {
  await getAuthUser();

  const [runs, deptRows] = await Promise.all([
    db
      .select({
        id:              payrollRuns.id,
        periodStart:     payrollRuns.periodStart,
        periodEnd:       payrollRuns.periodEnd,
        status:          payrollRuns.status,
        totalGross:      payrollRuns.totalGross,
        totalDeductions: payrollRuns.totalDeductions,
        totalNet:        payrollRuns.totalNet,
        dtrVerified:     payrollRuns.dtrVerified,
        createdAt:       payrollRuns.createdAt,
      })
      .from(payrollRuns)
      .orderBy(desc(payrollRuns.createdAt))
      .limit(20),
    db
      .select({ id: departments.id, name: departments.name, code: departments.code })
      .from(departments)
      .orderBy(departments.code),
  ]);

  // Runs where DTR was not confirmed by site logs (integrity concern)
  const unverifiedDraftCount = runs.filter(
    (r) => r.status === "DRAFT" && !r.dtrVerified,
  ).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/hr" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← HR & Payroll</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
              Payroll Processor
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              TRAIN Law 2023 withholding · SSS / PhilHealth / Pag-IBIG deductions · DTR integrity gate
            </p>
          </div>
          <a href="/hr/dtr" style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid #d1d5db",
            background: "#fff", color: "#374151", fontSize: "0.875rem", textDecoration: "none",
          }}>
            ↑ Upload / View DTR
          </a>
        </div>

        {/* DTR variance alert — real: unverified DRAFT payroll runs */}
        {unverifiedDraftCount > 0 && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "0.75rem",
            padding: "0.9rem 1.1rem", marginBottom: "1.5rem",
            background: "#fffbeb", borderLeft: "4px solid #f59e0b",
          }}>
            <span style={{ fontSize: "1.1rem", marginTop: "0.05rem" }}>⚠</span>
            <div>
              <p style={{ margin: "0 0 0.2rem", fontWeight: 700, fontSize: "0.875rem", color: "#92400e" }}>
                DTR Integrity Warning
              </p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#b45309" }}>
                {unverifiedDraftCount} draft payroll run{unverifiedDraftCount !== 1 ? "s" : ""} have
                DTR hours not confirmed by batching or fleet site logs.
                Review before approving.
              </p>
            </div>
          </div>
        )}

        {/* Process new run */}
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "1.5rem", marginBottom: "2rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
            Process New Payroll Run
          </h2>
          <ProcessRunForm departments={deptRows.map((d) => ({ ...d, code: d.code as string }))} />
        </div>

        {/* Past runs table */}
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
              Recent Payroll Runs
            </h2>
          </div>

          {runs.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
              No payroll runs yet. Process the first run above.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "780px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Period", "Status", "DTR Verified", "Gross", "Deductions", "Net Pay", ""].map((h, i) => (
                      <th key={i} style={{
                        padding: "0.65rem 1rem",
                        textAlign: i >= 3 && i <= 5 ? "right" : "left",
                        fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb",
                        fontSize: "0.75rem", textTransform: "uppercase" as const, letterSpacing: "0.04em",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const st = STATUS_STYLE[run.status] ?? STATUS_STYLE.DRAFT;
                    return (
                      <tr key={run.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.7rem 1rem", fontWeight: 600, color: "#111827", fontFamily: "monospace", fontSize: "0.82rem" }}>
                          {run.periodStart} → {run.periodEnd}
                        </td>
                        <td style={{ padding: "0.7rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: st.bg, color: st.color }}>
                            {run.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.7rem 1rem" }}>
                          {run.dtrVerified ? (
                            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#166534" }}>✓ Verified</span>
                          ) : (
                            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#d97706" }}>⚠ Unverified</span>
                          )}
                        </td>
                        <td style={{ padding: "0.7rem 1rem", textAlign: "right", fontFamily: "monospace" }}>{fmtPhp(run.totalGross)}</td>
                        <td style={{ padding: "0.7rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#dc2626" }}>
                          {run.totalDeductions ? `(${fmtPhp(run.totalDeductions)})` : "—"}
                        </td>
                        <td style={{ padding: "0.7rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtPhp(run.totalNet)}</td>
                        <td style={{ padding: "0.7rem 1rem", textAlign: "right" }}>
                          <a href={`/hr/payroll/${run.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>
                            View →
                          </a>
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
