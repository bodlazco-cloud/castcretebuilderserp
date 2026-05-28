export const dynamic = "force-dynamic";

import { db } from "@/db";
import { equipmentAssignments, equipment, projects, projectUnits, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
    ]);
    return result as T;
  } catch {
    return fallback;
  }
}

function formatDate(val: string | Date | null | undefined): string {
  if (!val) return "—";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(status: string | null) {
  let bg = "#f3f4f6";
  let color = "#6b7280";
  if (status === "ACTIVE") { bg = "#dcfce7"; color = "#166534"; }
  else if (status === "COMPLETED") { bg = "#eff6ff"; color = "#1e40af"; }
  return (
    <span style={{
      display: "inline-block",
      padding: "0.2rem 0.6rem",
      borderRadius: "999px",
      fontSize: "0.75rem",
      fontWeight: 600,
      background: bg,
      color,
    }}>
      {status ?? "—"}
    </span>
  );
}

export default async function InternalRentalLogsPage() {
  const rows = await safe(() =>
    db.select({
      id: equipmentAssignments.id,
      assignedDate: equipmentAssignments.assignedDate,
      returnedDate: equipmentAssignments.returnedDate,
      daysRented: equipmentAssignments.daysRented,
      dailyRate: equipmentAssignments.dailyRate,
      totalRentalIncome: equipmentAssignments.totalRentalIncome,
      status: equipmentAssignments.status,
      equipCode: equipment.code,
      equipName: equipment.name,
      equipType: equipment.type,
      projectName: projects.name,
      unitCode: projectUnits.unitCode,
      operatorName: users.fullName,
    })
    .from(equipmentAssignments)
    .leftJoin(equipment, eq(equipmentAssignments.equipmentId, equipment.id))
    .leftJoin(projects, eq(equipmentAssignments.projectId, projects.id))
    .leftJoin(projectUnits, eq(equipmentAssignments.unitId, projectUnits.id))
    .leftJoin(users, eq(equipmentAssignments.operatorId, users.id))
    .orderBy(desc(equipmentAssignments.assignedDate))
    .limit(200),
    []
  );

  const activeCount = rows.filter(r => r.status === "ACTIVE").length;
  const completedCount = rows.filter(r => r.status === "COMPLETED").length;
  const totalIncome = rows.reduce((sum, r) => sum + Number(r.totalRentalIncome ?? 0), 0);

  const kpis = [
    { label: "Total Assignments", value: String(rows.length), accent: "#0694a2" },
    { label: "Active", value: String(activeCount), accent: "#057a55" },
    { label: "Completed", value: String(completedCount), accent: "#1a56db" },
    {
      label: "Total Billing",
      value: `₱${totalIncome.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      accent: "#7e3af2",
    },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.8rem", color: "#0694a2", textDecoration: "none" }}>← Motorpool</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.3rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Internal Rental Logs</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Equipment assignments to construction sites — rates, durations, and billing records.
            </p>
          </div>
          <a href="/motorpool/assign" style={{
            padding: "0.55rem 1.1rem",
            borderRadius: "6px",
            background: "#0694a2",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}>
            + Assign Equipment
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpis.map(kpi => (
            <div key={kpi.label} style={{
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              padding: "1.25rem 1.5rem",
              borderTop: `4px solid ${kpi.accent}`,
            }}>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 500, marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{kpi.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: kpi.accent }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "#374151", marginBottom: "0.3rem" }}>No assignments yet</div>
            <div style={{ fontSize: "0.875rem" }}>Equipment assignments to construction sites will appear here.</div>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Equipment", "Type", "Project", "Unit", "Operator", "Assigned", "Returned", "Days", "Daily Rate", "Total Billing", "Status"].map(col => (
                      <th key={col} style={{
                        padding: "0.75rem 1rem",
                        textAlign: "left",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id} style={{
                      background: row.status === "ACTIVE" ? "#f0fdf4" : i % 2 === 0 ? "#fff" : "#fafafa",
                      borderBottom: "1px solid #e5e7eb",
                    }}>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>{row.equipCode ?? "—"}</span>
                        <span style={{ color: "#6b7280" }}> · </span>
                        <span style={{ color: "#374151" }}>{row.equipName ?? "—"}</span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#9ca3af", fontSize: "0.8rem", whiteSpace: "nowrap" }}>{row.equipType ?? "—"}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#374151", whiteSpace: "nowrap" }}>{row.projectName ?? "—"}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#374151", whiteSpace: "nowrap" }}>{row.unitCode ?? "—"}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#374151", whiteSpace: "nowrap" }}>{row.operatorName ?? "—"}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#374151", whiteSpace: "nowrap" }}>{formatDate(row.assignedDate)}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#374151", whiteSpace: "nowrap" }}>{formatDate(row.returnedDate)}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#374151", textAlign: "right" }}>
                        {row.daysRented != null ? Number(row.daysRented).toLocaleString("en-PH") : "—"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#374151", whiteSpace: "nowrap", textAlign: "right" }}>
                        ₱{Number(row.dailyRate ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", textAlign: "right", fontWeight: 700, color: "#111827" }}>
                        ₱{Number(row.totalRentalIncome ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                        {statusBadge(row.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #e5e7eb", fontSize: "0.8rem", color: "#9ca3af", textAlign: "right" }}>
              Showing {rows.length} record{rows.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
