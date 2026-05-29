export const dynamic = "force-dynamic";

import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { LogRentalForm } from "./LogRentalForm";

const ACCENT = "#7c3aed";

export default async function EquipmentRentalsPage() {
  const user = await getAuthUser();

  const [equipmentList, projects, productionLogs, rentals] = await Promise.all([
    db.select({
      id:              schema.equipment.id,
      code:            schema.equipment.code,
      name:            schema.equipment.name,
      dailyRentalRate: schema.equipment.dailyRentalRate,
    })
      .from(schema.equipment)
      .where(eq(schema.equipment.status, "AVAILABLE"))
      .orderBy(schema.equipment.code),

    db.select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects)
      .orderBy(schema.projects.name),

    db.select({
      id:          schema.batchingProductionLogs.id,
      batchDate:   schema.batchingProductionLogs.batchDate,
      shift:       schema.batchingProductionLogs.shift,
      mixCode:     schema.mixDesigns.code,
      projectName: schema.projects.name,
    })
      .from(schema.batchingProductionLogs)
      .leftJoin(schema.mixDesigns, eq(schema.batchingProductionLogs.mixDesignId, schema.mixDesigns.id))
      .leftJoin(schema.projects, eq(schema.batchingProductionLogs.projectId, schema.projects.id))
      .orderBy(desc(schema.batchingProductionLogs.batchDate))
      .limit(100),

    db.select({
      id:                schema.batchingEquipmentRentals.id,
      usageDate:         schema.batchingEquipmentRentals.usageDate,
      hoursOperated:     schema.batchingEquipmentRentals.hoursOperated,
      dailyRateSnapshot: schema.batchingEquipmentRentals.dailyRateSnapshot,
      totalCost:         schema.batchingEquipmentRentals.totalCost,
      notes:             schema.batchingEquipmentRentals.notes,
      equipCode:         schema.equipment.code,
      equipName:         schema.equipment.name,
      projectName:       schema.projects.name,
      batchDate:         schema.batchingProductionLogs.batchDate,
      shift:             schema.batchingProductionLogs.shift,
    })
      .from(schema.batchingEquipmentRentals)
      .leftJoin(schema.equipment, eq(schema.batchingEquipmentRentals.equipmentId, schema.equipment.id))
      .leftJoin(schema.projects, eq(schema.batchingEquipmentRentals.projectId, schema.projects.id))
      .leftJoin(schema.batchingProductionLogs, eq(schema.batchingEquipmentRentals.productionLogId, schema.batchingProductionLogs.id))
      .orderBy(desc(schema.batchingEquipmentRentals.usageDate)),
  ]);

  const totalHours   = rentals.reduce((s, r) => s + Number(r.hoursOperated), 0);
  const totalCost    = rentals.reduce((s, r) => s + Number(r.totalCost), 0);
  const uniqueEquip  = new Set(rentals.map((r) => r.equipCode)).size;

  const kpis = [
    { label: "Total Rentals",   value: rentals.length.toString(),                         sub: "entries logged" },
    { label: "Total Hours",     value: totalHours.toFixed(1) + "h",                        sub: "hours operated" },
    { label: "Total Cost",      value: "₱" + totalCost.toLocaleString("en-PH", { minimumFractionDigits: 2 }), sub: "equipment rental cost" },
    { label: "Equipment Used",  value: uniqueEquip.toString(),                             sub: "distinct machines" },
  ];

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
          <a href="/batching" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>← Back to Batching</a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>Equipment Rentals</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
              Log Motorpool equipment used per batch. Cost is Debit Batching Plant / Credit Motorpool.
            </p>
          </div>
          <LogRentalForm
            equipmentList={equipmentList.map((e) => ({ ...e, dailyRentalRate: String(e.dailyRentalRate) }))}
            projects={projects}
            productionLogs={productionLogs.map((l) => ({
              id: l.id,
              batchDate: l.batchDate,
              shift: l.shift,
              mixCode: l.mixCode ?? "—",
              projectName: l.projectName ?? "Unknown",
            }))}
            userId={user?.id ?? ""}
          />
        </div>

        {/* KPI bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{
              background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${ACCENT}`,
            }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>{k.value}</div>
              <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.15rem" }}>{k.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Accounting note */}
        <div style={{
          marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "#f5f3ff",
          border: "1px solid #ddd6fe", borderRadius: "8px", fontSize: "0.82rem", color: "#5b21b6",
        }}>
          <strong>Accounting Treatment:</strong> Each rental posts two ledger entries — Debit: Batching Plant
          Production Cost Center (OUTFLOW) · Credit: Motorpool Revenue Cost Center (INFLOW). Requires
          Batching &amp; Motorpool departments with active cost centers to be configured.
        </div>

        {/* Rentals table */}
        {rentals.length === 0 ? (
          <div style={{
            padding: "3rem", background: "#fff", borderRadius: "10px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🚜</div>
            <p style={{ margin: 0 }}>No equipment rentals logged yet.</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>
              Use the <strong>Log Equipment Rental</strong> button to record Motorpool equipment used in production.
            </p>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #e5e7eb", borderTop: `3px solid ${ACCENT}` }}>
              <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Rental Log ({rentals.length})</h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Date", "Equipment", "Project", "Linked Batch", "Hours", "Daily Rate", "Total Cost", "Notes"].map((h, i) => (
                      <th key={h} style={{
                        padding: "0.65rem 0.85rem", textAlign: i >= 4 ? "right" : "left",
                        fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rentals.map((r, idx) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "0.65rem 0.85rem", whiteSpace: "nowrap" }}>{r.usageDate}</td>
                      <td style={{ padding: "0.65rem 0.85rem" }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>{r.equipCode}</span>
                        <span style={{ color: "#9ca3af" }}> — {r.equipName}</span>
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", color: "#374151" }}>{r.projectName ?? "—"}</td>
                      <td style={{ padding: "0.65rem 0.85rem", color: "#6b7280" }}>
                        {r.batchDate ? `${r.batchDate} ${r.shift}` : <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontFamily: "monospace" }}>
                        {Number(r.hoursOperated).toFixed(1)}h
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontFamily: "monospace" }}>
                        ₱{Number(r.dailyRateSnapshot).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: ACCENT }}>
                        ₱{Number(r.totalCost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", color: "#6b7280", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.notes ?? <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f5f3ff", borderTop: "2px solid #ddd6fe" }}>
                    <td colSpan={4} style={{ padding: "0.65rem 0.85rem", fontSize: "0.78rem", fontWeight: 700, color: "#6d28d9" }}>
                      Totals
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#6d28d9" }}>
                      {totalHours.toFixed(1)}h
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem" }} />
                    <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#6d28d9" }}>
                      ₱{totalCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
