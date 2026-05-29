export const dynamic = "force-dynamic";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, sum } from "drizzle-orm";
import { RunBillingButton } from "./RunBillingButton";

const ACCENT = "#1a56db";

export default async function MonthlyBillingPage() {
  const billings = await db.select({
    id:           schema.equipmentMonthlyBillings.id,
    billingMonth: schema.equipmentMonthlyBillings.billingMonth,
    monthlyRate:  schema.equipmentMonthlyBillings.monthlyRate,
    status:       schema.equipmentMonthlyBillings.status,
    postedAt:     schema.equipmentMonthlyBillings.postedAt,
    equipCode:    schema.equipment.code,
    equipName:    schema.equipment.name,
    deptCode:     schema.departments.code,
    deptName:     schema.departments.name,
    projectName:  schema.projects.name,
  })
    .from(schema.equipmentMonthlyBillings)
    .leftJoin(schema.equipment,   eq(schema.equipmentMonthlyBillings.equipmentId, schema.equipment.id))
    .leftJoin(schema.departments, eq(schema.equipmentMonthlyBillings.deptId,      schema.departments.id))
    .leftJoin(schema.projects,    eq(schema.equipmentMonthlyBillings.projectId,   schema.projects.id))
    .orderBy(desc(schema.equipmentMonthlyBillings.billingMonth), desc(schema.equipmentMonthlyBillings.postedAt));

  const totalPosted  = billings.filter((b) => b.status === "POSTED").length;
  const totalRevenue = billings.filter((b) => b.status === "POSTED")
    .reduce((s, b) => s + Number(b.monthlyRate), 0);
  const uniqueMonths = new Set(billings.map((b) => b.billingMonth)).size;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthRevenue = billings
    .filter((b) => b.billingMonth === currentMonth && b.status === "POSTED")
    .reduce((s, b) => s + Number(b.monthlyRate), 0);

  // Group by month for display
  const byMonth = new Map<string, typeof billings>();
  for (const b of billings) {
    if (!byMonth.has(b.billingMonth)) byMonth.set(b.billingMonth, []);
    byMonth.get(b.billingMonth)!.push(b);
  }
  const sortedMonths = [...byMonth.keys()].sort().reverse();

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>

      <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>← Fleet (Motorpool)</a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>Monthly Equipment Billing</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
              Auto-posts on the 1st of each month via cron. Manual run available below.
            </p>
          </div>
          <RunBillingButton />
        </div>

        {/* KPI bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "This Month Revenue",  value: "₱" + thisMonthRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 }), sub: currentMonth },
            { label: "Total Posted",        value: totalPosted.toString(),                                                          sub: "billing entries" },
            { label: "Total Revenue",       value: "₱" + totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 }),       sub: "all posted months" },
            { label: "Months Billed",       value: uniqueMonths.toString(),                                                         sub: "distinct months" },
          ].map((k) => (
            <div key={k.label} style={{
              background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${ACCENT}`,
            }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, fontFamily: "monospace" }}>{k.value}</div>
              <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.15rem" }}>{k.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Cron setup info */}
        <div style={{
          marginBottom: "1.5rem", padding: "0.85rem 1rem", background: "#f0fdf4",
          border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "0.82rem", color: "#166534",
        }}>
          <strong>Cron Setup:</strong> Point your scheduler (cron-job.org or Replit Scheduled Task) to{" "}
          <code style={{ background: "#dcfce7", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
            GET /api/cron/monthly-billing
          </code>{" "}
          with header <code style={{ background: "#dcfce7", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
            Authorization: Bearer {"<CRON_SECRET>"}
          </code>{" "}
          on schedule <code style={{ background: "#dcfce7", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>0 1 1 * *</code>{" "}
          (01:00 on the 1st of each month).
        </div>

        {billings.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📋</div>
            <p style={{ margin: 0 }}>No billing records yet.</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>
              <a href="/motorpool/deployments" style={{ color: ACCENT }}>Create a deployment</a> first, then run billing.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {sortedMonths.map((month) => {
              const rows = byMonth.get(month)!;
              const monthTotal = rows.filter((r) => r.status === "POSTED").reduce((s, r) => s + Number(r.monthlyRate), 0);
              const isCurrentMonth = month === currentMonth;

              return (
                <div key={month} style={{
                  background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden",
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0.75rem 1.25rem", borderBottom: "1px solid #e5e7eb",
                    borderTop: isCurrentMonth ? `3px solid ${ACCENT}` : "3px solid #e5e7eb",
                    background: isCurrentMonth ? "#eff6ff" : "#f9fafb",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{month}</span>
                      {isCurrentMonth && (
                        <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem", background: ACCENT, color: "#fff", borderRadius: "999px", fontWeight: 700 }}>
                          CURRENT
                        </span>
                      )}
                      <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>{rows.length} machine{rows.length !== 1 ? "s" : ""}</span>
                    </div>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: ACCENT, fontSize: "0.95rem" }}>
                      ₱{monthTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })} total
                    </span>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        {["Equipment", "Billed To", "Project", "Amount", "Status", "Posted At"].map((h, i) => (
                          <th key={h} style={{ padding: "0.5rem 0.85rem", textAlign: i === 3 ? "right" : "left", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((b) => (
                        <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.6rem 0.85rem" }}>
                            <span style={{ fontWeight: 600 }}>{b.equipCode}</span>
                            <span style={{ color: "#9ca3af" }}> — {b.equipName}</span>
                          </td>
                          <td style={{ padding: "0.6rem 0.85rem" }}>
                            <span style={{ padding: "0.15rem 0.4rem", background: "#eff6ff", color: "#1e40af", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>
                              {b.deptCode}
                            </span>
                            <span style={{ marginLeft: "0.35rem", color: "#374151" }}>{b.deptName}</span>
                          </td>
                          <td style={{ padding: "0.6rem 0.85rem", color: "#6b7280" }}>{b.projectName ?? "—"}</td>
                          <td style={{ padding: "0.6rem 0.85rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                            ₱{Number(b.monthlyRate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "0.6rem 0.85rem" }}>
                            <span style={{
                              padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700,
                              background: b.status === "POSTED" ? "#f0fdf4" : "#fef9c3",
                              color: b.status === "POSTED" ? "#16a34a" : "#92400e",
                            }}>
                              {b.status}
                            </span>
                          </td>
                          <td style={{ padding: "0.6rem 0.85rem", color: "#9ca3af", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                            {b.postedAt ? new Date(b.postedAt).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
