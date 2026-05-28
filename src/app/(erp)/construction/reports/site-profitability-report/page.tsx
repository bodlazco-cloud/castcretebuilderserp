export const dynamic = "force-dynamic";
import { db } from "@/db";
import { workAccomplishedReports, purchaseOrders, projects } from "@/db/schema";
import { eq } from "drizzle-orm";

const ACCENT = "#1a56db";

function fmt(n: number) {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function SiteProfitabilityReportPage() {
  const [wars, pos] = await Promise.all([
    db
      .select({
        id: workAccomplishedReports.id,
        status: workAccomplishedReports.status,
        grossAccomplishment: workAccomplishedReports.grossAccomplishment,
        projectId: workAccomplishedReports.projectId,
        projectName: projects.name,
        projectStatus: projects.status,
      })
      .from(workAccomplishedReports)
      .leftJoin(projects, eq(workAccomplishedReports.projectId, projects.id)),
    db
      .select({
        id: purchaseOrders.id,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        projectId: purchaseOrders.projectId,
        projectName: projects.name,
        projectStatus: projects.status,
      })
      .from(purchaseOrders)
      .leftJoin(projects, eq(purchaseOrders.projectId, projects.id)),
  ]);

  const projectMap = new Map<string, {
    projectId: string;
    projectName: string;
    projectStatus: string;
    billed: number;
    actualCost: number;
  }>();

  for (const w of wars) {
    if (!w.projectId) continue;
    if (!projectMap.has(w.projectId)) {
      projectMap.set(w.projectId, {
        projectId: w.projectId,
        projectName: w.projectName ?? w.projectId,
        projectStatus: w.projectStatus ?? "—",
        billed: 0,
        actualCost: 0,
      });
    }
    if (w.status === "APPROVED") {
      const entry = projectMap.get(w.projectId)!;
      entry.billed += parseFloat(w.grossAccomplishment ?? "0");
    }
  }

  for (const p of pos) {
    if (!p.projectId) continue;
    if (!projectMap.has(p.projectId)) {
      projectMap.set(p.projectId, {
        projectId: p.projectId,
        projectName: p.projectName ?? p.projectId,
        projectStatus: p.projectStatus ?? "—",
        billed: 0,
        actualCost: 0,
      });
    }
    if (p.status === "DELIVERED") {
      const entry = projectMap.get(p.projectId)!;
      entry.actualCost += parseFloat(p.totalAmount ?? "0");
    }
  }

  const rows = Array.from(projectMap.values()).map((r) => {
    const margin = r.billed - r.actualCost;
    const marginPct = r.billed > 0 ? (margin / r.billed) * 100 : 0;
    const profitability = margin > 0 ? "Profitable" : margin < 0 ? "Loss" : "Break-even";
    return { ...r, margin, marginPct, profitability };
  });

  const totalBilled = rows.reduce((s, r) => s + r.billed, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualCost, 0);
  const overallMargin = totalBilled - totalActual;

  const kpis = [
    { label: "Projects with Data", value: String(rows.length) },
    { label: "Total Billed", value: "₱ " + fmt(totalBilled) },
    { label: "Total Actual Cost", value: "₱ " + fmt(totalActual) },
    { label: "Overall Margin", value: "₱ " + fmt(overallMargin), color: overallMargin >= 0 ? "#057a55" : "#dc2626" },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
        </div>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Site Profitability Report</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Approved billing vs actual procurement cost per project.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem" }}>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: k.color ?? "#111827" }}>{k.value}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.9rem" }}>
            No project data available. Approved WARs and delivered POs will appear here.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Status", "Total Billed", "Actual Cost (POs)", "Gross Margin", "Margin %", "Profitability"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const barPct = Math.min(Math.abs(r.marginPct), 100);
                    const barColor = r.marginPct >= 20 ? "#057a55" : r.marginPct >= 0 ? "#d97706" : "#dc2626";
                    const profitColor = r.profitability === "Profitable" ? { bg: "#f0fdf4", color: "#057a55" }
                      : r.profitability === "Loss" ? { bg: "#fef2f2", color: "#dc2626" }
                      : { bg: "#f3f4f6", color: "#6b7280" };
                    return (
                      <tr key={r.projectId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#111827" }}>{r.projectName}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "999px", background: "#f3f4f6", color: "#374151" }}>
                            {r.projectStatus}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#374151" }}>₱ {fmt(r.billed)}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "#374151" }}>₱ {fmt(r.actualCost)}</td>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: r.margin >= 0 ? "#057a55" : "#dc2626" }}>
                          {r.margin >= 0 ? "+" : ""}₱ {fmt(r.margin)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", minWidth: "130px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ flex: 1, height: "6px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                              <div style={{ width: `${barPct}%`, height: "100%", background: barColor, borderRadius: "999px" }} />
                            </div>
                            <span style={{ fontSize: "0.78rem", color: barColor, fontWeight: 600, whiteSpace: "nowrap" }}>
                              {r.marginPct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: profitColor.bg, color: profitColor.color }}>
                            {r.profitability}
                          </span>
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
