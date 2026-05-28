export const dynamic = "force-dynamic";

import { db } from "@/db";
import { equipmentAssignments, equipment, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([fn(), new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000))]);
  } catch {
    return fallback;
  }
}

export default async function RentalBillingPage() {
  const rows = await safe(
    () =>
      db
        .select({
          projectId: projects.id,
          projectName: projects.name,
          equipCode: equipment.code,
          equipName: equipment.name,
          equipType: equipment.type,
          assignedDate: equipmentAssignments.assignedDate,
          returnedDate: equipmentAssignments.returnedDate,
          daysRented: equipmentAssignments.daysRented,
          dailyRate: equipmentAssignments.dailyRate,
          totalRentalIncome: equipmentAssignments.totalRentalIncome,
          status: equipmentAssignments.status,
        })
        .from(equipmentAssignments)
        .leftJoin(equipment, eq(equipmentAssignments.equipmentId, equipment.id))
        .leftJoin(projects, eq(equipmentAssignments.projectId, projects.id))
        .orderBy(desc(equipmentAssignments.assignedDate))
        .limit(200),
    []
  );

  type ProjectBilling = { projectName: string; rows: typeof rows; totalBilling: number };
  const projectMap = new Map<string, ProjectBilling>();
  for (const row of rows) {
    const pid = row.projectId ?? "unknown";
    if (!projectMap.has(pid)) projectMap.set(pid, { projectName: row.projectName ?? "Unknown", rows: [], totalBilling: 0 });
    const g = projectMap.get(pid)!;
    g.rows.push(row);
    g.totalBilling += Number(row.totalRentalIncome ?? 0);
  }

  const totalAllBilling = rows.reduce((sum, r) => sum + Number(r.totalRentalIncome ?? 0), 0);
  const activeCount = rows.filter((r) => r.status === "ACTIVE").length;

  const fmtPHP = (val: number) =>
    "₱" + val.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (val: string | null | undefined) => {
    if (!val) return "—";
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  };

  const statusBadge = (status: string | null) => {
    if (status === "ACTIVE")
      return { bg: "#d1fae5", color: "#065f46", label: "Active" };
    if (status === "COMPLETED")
      return { bg: "#dbeafe", color: "#1e40af", label: "Completed" };
    return { bg: "#f3f4f6", color: "#6b7280", label: status ?? "—" };
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        details > summary { list-style: none; }
        details > summary::-webkit-details-marker { display: none; }
        details > summary .chevron { display: inline-block; transition: transform 0.2s; }
        details[open] > summary .chevron { transform: rotate(90deg); }
      `}</style>

      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.82rem", color: "#0694a2", textDecoration: "none", fontWeight: 500 }}>
            ← Motorpool
          </a>
        </div>

        <h1 style={{ margin: "0 0 0.3rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
          Rental Billing
        </h1>
        <p style={{ margin: "0 0 1.75rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Equipment assignment billing summary — charges billed to each project for equipment use.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: "3px solid #0694a2" }}>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              Total Assignments
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0694a2" }}>{rows.length}</div>
          </div>

          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: "3px solid #7e3af2" }}>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              Total Billed
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#7e3af2", fontVariantNumeric: "tabular-nums" }}>
              {fmtPHP(totalAllBilling)}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: "3px solid #057a55" }}>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              Active Rentals
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#057a55" }}>{activeCount}</div>
          </div>
        </div>

        {projectMap.size === 0 ? (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "3rem", textAlign: "center", color: "#9ca3af", fontSize: "0.95rem" }}>
            No equipment assignments found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {Array.from(projectMap.entries()).map(([pid, group]) => (
              <details key={pid} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                <summary style={{ padding: "1rem 1.25rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.75rem", userSelect: "none", borderBottom: "1px solid transparent" }}>
                  <span className="chevron" style={{ color: "#0694a2", fontWeight: 700, fontSize: "0.85rem" }}>▶</span>
                  <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.97rem", flex: 1 }}>
                    {group.projectName}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>
                    {group.rows.length} assignment{group.rows.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0 0.25rem" }}>·</span>
                  <span style={{ fontWeight: 700, color: "#7e3af2", fontSize: "0.92rem", fontVariantNumeric: "tabular-nums" }}>
                    {fmtPHP(group.totalBilling)}
                  </span>
                </summary>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        {["Equipment", "Type", "From", "To", "Days", "Daily Rate", "Billed", "Status"].map((h) => (
                          <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.78rem", color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row, i) => {
                        const badge = statusBadge(row.status);
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "0.7rem 1rem", color: "#111827", fontWeight: 500 }}>
                              <div>{row.equipName ?? "—"}</div>
                              {row.equipCode && <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{row.equipCode}</div>}
                            </td>
                            <td style={{ padding: "0.7rem 1rem", color: "#6b7280" }}>{row.equipType ?? "—"}</td>
                            <td style={{ padding: "0.7rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>{fmtDate(row.assignedDate)}</td>
                            <td style={{ padding: "0.7rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>{fmtDate(row.returnedDate)}</td>
                            <td style={{ padding: "0.7rem 1rem", color: "#374151", textAlign: "center" }}>{row.daysRented ?? "—"}</td>
                            <td style={{ padding: "0.7rem 1rem", color: "#374151", whiteSpace: "nowrap" }}>
                              {row.dailyRate != null ? fmtPHP(Number(row.dailyRate)) : "—"}
                            </td>
                            <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap" }}>
                              <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#7e3af2" }}>
                                {row.totalRentalIncome != null ? fmtPHP(Number(row.totalRentalIncome)) : "—"}
                              </span>
                            </td>
                            <td style={{ padding: "0.7rem 1rem" }}>
                              <span style={{ background: badge.bg, color: badge.color, padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
