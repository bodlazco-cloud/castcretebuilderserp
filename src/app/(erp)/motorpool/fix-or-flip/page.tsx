export const dynamic = "force-dynamic";
import { db } from "@/db";
import { equipment, fixOrFlipAssessments } from "@/db/schema";
import { ne, desc } from "drizzle-orm";
import RunAssessmentButton from "./RunAssessmentButton";

const REC_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  FLIP:    { bg: "#fef2f2", color: "#dc2626", label: "FLIP" },
  MONITOR: { bg: "#fffbeb", color: "#d97706", label: "MONITOR" },
  FIX:     { bg: "#f0fdf4", color: "#16a34a", label: "FIX" },
};
const REC_ORDER = ["FLIP", "MONITOR", "FIX", "NONE"];

const fmtPhp = (v: string | number | null) =>
  v != null ? `₱${Number(v).toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : "—";

export default async function FixOrFlipPage() {
  const [equipList, allAssessments] = await Promise.all([
    db
      .select({
        id:               equipment.id,
        code:             equipment.code,
        name:             equipment.name,
        type:             equipment.type,
        totalEngineHours: equipment.totalEngineHours,
        isFlaggedForFlip: equipment.isFlaggedForFlip,
        isLocked:         equipment.isLocked,
      })
      .from(equipment)
      .where(ne(equipment.status, "SOLD"))
      .orderBy(equipment.code),
    db
      .select({
        equipmentId:                  fixOrFlipAssessments.equipmentId,
        recommendation:               fixOrFlipAssessments.recommendation,
        efficiencyRatio:              fixOrFlipAssessments.efficiencyRatio,
        annualRentalIncome:           fixOrFlipAssessments.annualRentalIncome,
        cumulativeMaintenanceCost12mo: fixOrFlipAssessments.cumulativeMaintenanceCost12mo,
        consecutiveMonthsOver50Pct:   fixOrFlipAssessments.consecutiveMonthsOver50Pct,
        assessmentDate:               fixOrFlipAssessments.assessmentDate,
        isTriggered:                  fixOrFlipAssessments.isTriggered,
      })
      .from(fixOrFlipAssessments)
      .orderBy(desc(fixOrFlipAssessments.createdAt)),
  ]);

  // Latest assessment per equipment (allAssessments already ordered DESC)
  const latestMap = new Map<string, typeof allAssessments[0]>();
  for (const a of allAssessments) {
    if (!latestMap.has(a.equipmentId)) latestMap.set(a.equipmentId, a);
  }

  const rows = equipList
    .map((e) => ({ ...e, assessment: latestMap.get(e.id) ?? null }))
    .sort((a, b) => {
      const ar = REC_ORDER.indexOf(a.assessment?.recommendation ?? "NONE");
      const br = REC_ORDER.indexOf(b.assessment?.recommendation ?? "NONE");
      return ar !== br ? ar - br : a.code.localeCompare(b.code);
    });

  const flipCount    = rows.filter((r) => r.assessment?.recommendation === "FLIP").length;
  const monitorCount = rows.filter((r) => r.assessment?.recommendation === "MONITOR").length;
  const fixCount     = rows.filter((r) => r.assessment?.recommendation === "FIX").length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.8rem", color: "#0694a2", textDecoration: "none" }}>← Motorpool</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>Fix or Flip Assessment</h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
              Each machine assessed on 5 triggers: efficiency ratio, consecutive months, engine hours, downtime, and purchase-value threshold.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {[
              { label: "Flip", count: flipCount,    bg: "#fef2f2", color: "#dc2626" },
              { label: "Monitor", count: monitorCount, bg: "#fffbeb", color: "#d97706" },
              { label: "Healthy", count: fixCount,   bg: "#f0fdf4", color: "#16a34a" },
            ].map(({ label, count, bg, color }) => (
              <div key={label} style={{ padding: "0.5rem 1rem", background: bg, borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color }}>{count}</div>
                <div style={{ fontSize: "0.72rem", color, fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {rows.map((row) => {
            const a = row.assessment;
            const rec = a?.recommendation ?? null;
            const style = rec ? REC_STYLE[rec] : { bg: "#fff", color: "#9ca3af", label: "Not Assessed" };
            const effPct = a ? (Number(a.efficiencyRatio) * 100).toFixed(1) : null;

            return (
              <div
                key={row.id}
                style={{
                  background: style.bg,
                  border: `1px solid ${rec === "FLIP" ? "#fca5a5" : rec === "MONITOR" ? "#fde68a" : "#e5e7eb"}`,
                  borderRadius: "10px",
                  padding: "1.1rem 1.25rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.95rem" }}>{row.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "#6b7280", fontFamily: "monospace" }}>{row.code} · {row.type}</div>
                  </div>
                  <span style={{
                    padding: "0.2rem 0.6rem", borderRadius: "999px",
                    fontSize: "0.7rem", fontWeight: 700,
                    background: style.bg, color: style.color,
                    border: `1px solid ${style.color}`,
                  }}>
                    {style.label}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 0.75rem", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                  <div style={{ color: "#6b7280" }}>12-mo Income</div>
                  <div style={{ fontWeight: 600, textAlign: "right" }}>{fmtPhp(a?.annualRentalIncome ?? null)}</div>

                  <div style={{ color: "#6b7280" }}>12-mo Maintenance</div>
                  <div style={{ fontWeight: 600, textAlign: "right", color: "#dc2626" }}>
                    {a ? fmtPhp(a.cumulativeMaintenanceCost12mo) : "—"}
                  </div>

                  <div style={{ color: "#6b7280" }}>Efficiency Ratio</div>
                  <div style={{
                    fontWeight: 700, textAlign: "right",
                    color: effPct && Number(effPct) > 50 ? "#dc2626" : effPct && Number(effPct) > 30 ? "#d97706" : "#16a34a",
                  }}>
                    {effPct ? `${effPct}%` : "—"}
                  </div>

                  <div style={{ color: "#6b7280" }}>Engine Hours</div>
                  <div style={{ fontWeight: 600, textAlign: "right" }}>{Number(row.totalEngineHours).toLocaleString()} h</div>

                  {a && a.consecutiveMonthsOver50Pct > 0 && (
                    <>
                      <div style={{ color: "#6b7280" }}>Months &gt;50%</div>
                      <div style={{ fontWeight: 700, textAlign: "right", color: "#dc2626" }}>
                        {a.consecutiveMonthsOver50Pct} / 3
                      </div>
                    </>
                  )}
                </div>

                {a?.assessmentDate && (
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: "0.6rem" }}>
                    Last assessed: {a.assessmentDate}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <RunAssessmentButton equipmentId={row.id} />
                  {row.isLocked && (
                    <span style={{ fontSize: "0.7rem", color: "#dc2626", fontWeight: 600 }}>⚠ LOCKED</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {rows.length === 0 && (
          <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af", background: "#fff", borderRadius: "8px" }}>
            No equipment records found.
          </div>
        )}
      </div>
    </main>
  );
}
