import { db } from "@/db";
import { developerAdvanceTracker, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 6000)
      ),
    ]);
    return result;
  } catch {
    return fallback;
  }
}

const php = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function Page() {
  const rows = await safe(
    () =>
      db
        .select({
          id: developerAdvanceTracker.id,
          totalAdvance: developerAdvanceTracker.totalAdvance,
          totalRecovered: developerAdvanceTracker.totalRecovered,
          remainingBalance: developerAdvanceTracker.remainingBalance,
          lastUpdated: developerAdvanceTracker.lastUpdated,
          projectName: projects.name,
          projectStatus: projects.status,
        })
        .from(developerAdvanceTracker)
        .leftJoin(projects, eq(developerAdvanceTracker.projectId, projects.id))
        .orderBy(projects.name),
    []
  );

  const totalAdvanceAll = rows.reduce((s, r) => s + Number(r.totalAdvance), 0);
  const totalRecoveredAll = rows.reduce((s, r) => s + Number(r.totalRecovered), 0);
  const totalRemainingAll = rows.reduce((s, r) => s + Number(r.remainingBalance ?? 0), 0);
  const overallRecoveryPct =
    totalAdvanceAll > 0 ? (totalRecoveredAll / totalAdvanceAll) * 100 : 0;

  return (
    <div style={{ padding: "32px 24px", maxWidth: "1200px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link
          href="/finance"
          style={{ color: "#057a55", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}
        >
          ← Finance & Accounting
        </Link>
      </div>

      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "#111827" }}>
          Developer Advance Tracker
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#6b7280" }}>
          Loan advances from the developer used to fund project construction.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "4px solid #057a55" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Projects Tracked</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#057a55" }}>{rows.length}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "4px solid #7e3af2" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Total Advance</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#7e3af2" }}>{php(totalAdvanceAll)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "4px solid #1a56db" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Total Recovered</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a56db" }}>{php(totalRecoveredAll)}</div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{overallRecoveryPct.toFixed(1)}% overall</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "4px solid #dc2626" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Outstanding</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#dc2626" }}>{php(totalRemainingAll)}</div>
        </div>
      </div>

      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px 18px", marginBottom: "28px", fontSize: "13px", color: "#166534" }}>
        Developer advances represent construction funding provided upfront. Recovery happens through progress billings (WAR-based invoices) less deductions.
      </div>

      <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Project</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Total Advance</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Total Recovered</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Remaining Balance</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap", minWidth: "160px" }}>Recovery %</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "48px 16px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
                  No developer advance records found.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const advance = Number(row.totalAdvance);
                const recovered = Number(row.totalRecovered);
                const remaining = Number(row.remainingBalance ?? 0);
                const pct = advance > 0 ? (recovered / advance) * 100 : 0;
                const barColor = pct >= 50 ? "#057a55" : pct >= 20 ? "#e3a008" : "#dc2626";
                const pctLabel = pct >= 50 ? "#057a55" : pct >= 20 ? "#b45309" : "#dc2626";
                const isActive = row.projectStatus === "ACTIVE";

                return (
                  <tr
                    key={row.id}
                    style={{ borderBottom: i < rows.length - 1 ? "1px solid #f3f4f6" : "none", verticalAlign: "middle" }}
                  >
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#111827" }}>
                      {row.projectName ?? "—"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: isActive ? "#dcfce7" : "#f3f4f6",
                        color: isActive ? "#166534" : "#6b7280",
                      }}>
                        {row.projectStatus ?? "—"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: "#374151" }}>
                      {php(advance)}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", color: "#374151" }}>
                      {php(recovered)}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 600, color: remaining > 0 ? "#dc2626" : "#057a55" }}>
                      {php(remaining)}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: pctLabel, minWidth: "42px" }}>
                          {pct.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, height: "6px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden", minWidth: "80px" }}>
                          <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: barColor }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>
                      {fmtDate(row.lastUpdated)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
