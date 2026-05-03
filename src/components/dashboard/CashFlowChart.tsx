import { db } from "@/db";
import { cashFlowProjections } from "@/db/schema";
import { desc } from "drizzle-orm";

const fmtM = (v: number) =>
  v >= 1_000_000
    ? `₱${(v / 1_000_000).toFixed(1)}M`
    : `₱${(v / 1_000).toFixed(0)}k`;

const BAR_H = 160;

export default async function CashFlowChart() {
  const raw = await db
    .select({
      projectionDate:           cashFlowProjections.projectionDate,
      projectedInflow:          cashFlowProjections.projectedInflow,
      projectedMaterialOutflow: cashFlowProjections.projectedMaterialOutflow,
      projectedLaborOutflow:    cashFlowProjections.projectedLaborOutflow,
      approvedPayables:         cashFlowProjections.approvedPayables,
      netGap:                   cashFlowProjections.netGap,
      isBelowBuffer:            cashFlowProjections.isBelowBuffer,
    })
    .from(cashFlowProjections)
    .orderBy(desc(cashFlowProjections.projectionDate))
    .limit(8);

  const rows = [...raw].reverse(); // oldest → newest

  if (rows.length === 0) {
    return (
      <div style={{
        width: "100%", height: "200px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb",
      }}>
        <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
          No cash flow projections recorded yet.
        </p>
      </div>
    );
  }

  const processed = rows.map((r) => ({
    label: new Date(r.projectionDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
    inflow:  Number(r.projectedInflow),
    outflow: Number(r.projectedMaterialOutflow) + Number(r.projectedLaborOutflow) + Number(r.approvedPayables),
    netGap:  Number(r.netGap ?? 0),
    below:   r.isBelowBuffer,
  }));

  const maxValue = Math.max(...processed.flatMap((r) => [r.inflow, r.outflow]), 1);

  return (
    <div style={{ width: "100%" }}>
      {/* Bar group area */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: `${BAR_H + 28}px` }}>
        {processed.map((row, i) => {
          const inflowH  = (row.inflow  / maxValue) * BAR_H;
          const outflowH = (row.outflow / maxValue) * BAR_H;
          const inflowColor = row.below ? "#fca5a5" : "#2563eb";

          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "flex-end",
                height: "100%", gap: 0,
              }}
            >
              {/* Net gap label when below buffer */}
              {row.below && (
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#dc2626", marginBottom: "2px", whiteSpace: "nowrap" }}>
                  {fmtM(row.netGap)}
                </div>
              )}

              {/* Bars */}
              <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", width: "100%", justifyContent: "center" }}>
                <div
                  title={`Inflow: ${fmtM(row.inflow)}`}
                  style={{
                    width: "44%", height: `${Math.max(inflowH, 2)}px`,
                    background: inflowColor, borderRadius: "3px 3px 0 0",
                  }}
                />
                <div
                  title={`Outflow: ${fmtM(row.outflow)}`}
                  style={{
                    width: "44%", height: `${Math.max(outflowH, 2)}px`,
                    background: "#94a3b8", borderRadius: "3px 3px 0 0",
                  }}
                />
              </div>

              {/* Date label */}
              <div style={{
                fontSize: "10px", color: "#9ca3af", fontWeight: 600,
                textAlign: "center", marginTop: "4px", whiteSpace: "nowrap",
              }}>
                {row.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gridline baseline */}
      <div style={{ borderTop: "1px solid #e5e7eb", margin: "0 0 0.75rem" }} />

      {/* Legend */}
      <div style={{ display: "flex", gap: "1.25rem", justifyContent: "center", fontSize: "11px", color: "#6b7280" }}>
        {[
          { bg: "#2563eb", label: "Projected Inflow" },
          { bg: "#94a3b8", label: "Total Outflow" },
          { bg: "#fca5a5", label: "Below Buffer" },
        ].map(({ bg, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ display: "inline-block", width: "10px", height: "10px", background: bg, borderRadius: "2px" }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
