export const dynamic = "force-dynamic";

import { db } from "@/db";
import { developerAdvanceTracker, invoices, projects } from "@/db/schema";
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

const php = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

export default async function DeveloperSummaryPage() {
  const [trackerRows, invoiceRows] = await Promise.all([
    safe(
      () =>
        db
          .select({
            projectId: developerAdvanceTracker.projectId,
            totalAdvance: developerAdvanceTracker.totalAdvance,
            totalRecovered: developerAdvanceTracker.totalRecovered,
            remainingBalance: developerAdvanceTracker.remainingBalance,
            projectName: projects.name,
            projectStatus: projects.status,
            contractValue: projects.contractValue,
          })
          .from(developerAdvanceTracker)
          .leftJoin(projects, eq(developerAdvanceTracker.projectId, projects.id)),
      []
    ),
    safe(
      () =>
        db
          .select({
            projectId: invoices.projectId,
            status: invoices.status,
            netAmountDue: invoices.netAmountDue,
            collectionAmount: invoices.collectionAmount,
          })
          .from(invoices),
      []
    ),
  ]);

  const invoicesByProject = new Map<string, { totalInvoiced: number; totalCollected: number }>();
  for (const inv of invoiceRows) {
    if (!invoicesByProject.has(inv.projectId)) {
      invoicesByProject.set(inv.projectId, { totalInvoiced: 0, totalCollected: 0 });
    }
    const entry = invoicesByProject.get(inv.projectId)!;
    entry.totalInvoiced += Number(inv.netAmountDue ?? 0);
    if (inv.status === "COLLECTED") {
      entry.totalCollected += Number(inv.collectionAmount ?? 0);
    }
  }

  const rows = trackerRows.map((t) => {
    const totalAdvance = Number(t.totalAdvance ?? 0);
    const totalRecovered = Number(t.totalRecovered ?? 0);
    const inv = invoicesByProject.get(t.projectId) ?? { totalInvoiced: 0, totalCollected: 0 };
    const totalInvoiced = inv.totalInvoiced;
    const totalCollected = inv.totalCollected;
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;
    const recoveryRate = totalAdvance > 0 ? (totalRecovered / totalAdvance) * 100 : 0;
    return {
      projectId: t.projectId,
      projectName: t.projectName,
      projectStatus: t.projectStatus,
      contractValue: Number(t.contractValue ?? 0),
      totalAdvance,
      totalRecovered,
      totalInvoiced,
      totalCollected,
      collectionRate,
      recoveryRate,
    };
  });

  const uniqueProjects = rows.length;
  const sumAdvance = rows.reduce((s, r) => s + r.totalAdvance, 0);
  const sumInvoiced = rows.reduce((s, r) => s + r.totalInvoiced, 0);
  const sumCollected = rows.reduce((s, r) => s + r.totalCollected, 0);

  const kpis = [
    { label: "Projects", value: String(uniqueProjects), accent: "#057a55" },
    { label: "Total Advances", value: php(sumAdvance), accent: "#7e3af2" },
    { label: "Total Invoiced", value: php(sumInvoiced), accent: "#1a56db" },
    { label: "Total Collected", value: php(sumCollected), accent: "#057a55" },
  ];

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <a href="/finance" style={{ fontSize: "13px", color: "#057a55", textDecoration: "none", fontWeight: 500 }}>
            ← Finance & Accounting
          </a>
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: "26px", fontWeight: 700, color: "#111827" }}>Developer Summary</h1>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#6b7280" }}>
          Per-project developer advance and invoice collection summary.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `4px solid ${k.accent}` }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>{k.label}</div>
              <div style={{ fontSize: k.value.startsWith("₱") ? "18px" : "28px", fontWeight: 700, color: k.accent, wordBreak: "break-all" }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#111827" }}>Per-Project Summary</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Project</th>
                  <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Status</th>
                  <th style={{ padding: "11px 16px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Contract Value</th>
                  <th style={{ padding: "11px 16px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Advance</th>
                  <th style={{ padding: "11px 16px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Recovered</th>
                  <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap", minWidth: "160px" }}>Recovery %</th>
                  <th style={{ padding: "11px 16px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Invoiced</th>
                  <th style={{ padding: "11px 16px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Collected</th>
                  <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap", minWidth: "160px" }}>Collection %</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "48px 16px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
                      No developer summary data found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => {
                    const recoveryBarColor = row.recoveryRate >= 50 ? "#057a55" : row.recoveryRate >= 20 ? "#e3a008" : "#dc2626";
                    const recoveryTextColor = row.recoveryRate >= 50 ? "#057a55" : row.recoveryRate >= 20 ? "#b45309" : "#dc2626";
                    const collectionBarColor = row.collectionRate >= 80 ? "#057a55" : row.collectionRate >= 40 ? "#e3a008" : "#dc2626";
                    const collectionTextColor = row.collectionRate >= 80 ? "#057a55" : row.collectionRate >= 40 ? "#b45309" : "#dc2626";
                    const isActive = row.projectStatus === "ACTIVE";
                    const isCompleted = row.projectStatus === "COMPLETED";
                    const statusBg = isActive ? "#dcfce7" : isCompleted ? "#dbeafe" : "#f3f4f6";
                    const statusColor = isActive ? "#166534" : isCompleted ? "#1e40af" : "#6b7280";
                    return (
                      <tr key={row.projectId} style={{ borderBottom: i < rows.length - 1 ? "1px solid #f3f4f6" : "none", verticalAlign: "middle" }}>
                        <td style={{ padding: "13px 16px", fontWeight: 600, color: "#111827" }}>{row.projectName ?? "—"}</td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: statusBg, color: statusColor }}>
                            {row.projectStatus ?? "—"}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px", textAlign: "right", color: "#374151", whiteSpace: "nowrap" }}>{php(row.contractValue)}</td>
                        <td style={{ padding: "13px 16px", textAlign: "right", color: "#374151", whiteSpace: "nowrap" }}>{php(row.totalAdvance)}</td>
                        <td style={{ padding: "13px 16px", textAlign: "right", color: "#374151", whiteSpace: "nowrap" }}>{php(row.totalRecovered)}</td>
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: recoveryTextColor, minWidth: "42px" }}>{row.recoveryRate.toFixed(1)}%</span>
                            <div style={{ flex: 1, height: "6px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden", minWidth: "80px" }}>
                              <div style={{ height: "100%", width: `${Math.min(row.recoveryRate, 100)}%`, background: recoveryBarColor }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "13px 16px", textAlign: "right", color: "#374151", whiteSpace: "nowrap" }}>
                          {row.totalInvoiced > 0 ? php(row.totalInvoiced) : "—"}
                        </td>
                        <td style={{ padding: "13px 16px", textAlign: "right", color: "#374151", whiteSpace: "nowrap" }}>
                          {row.totalCollected > 0 ? php(row.totalCollected) : "—"}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: collectionTextColor, minWidth: "42px" }}>{row.collectionRate.toFixed(1)}%</span>
                            <div style={{ flex: 1, height: "6px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden", minWidth: "80px" }}>
                              <div style={{ height: "100%", width: `${Math.min(row.collectionRate, 100)}%`, background: collectionBarColor }} />
                            </div>
                          </div>
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
