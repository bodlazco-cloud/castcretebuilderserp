export const dynamic = "force-dynamic";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#0694a2";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  AVAILABLE:   { bg: "#f0fdf4", color: "#057a55" },
  ASSIGNED:    { bg: "#eff6ff", color: "#1a56db" },
  MAINTENANCE: { bg: "#fef9c3", color: "#713f12" },
  DISPOSED:    { bg: "#f3f4f6", color: "#9ca3af" },
};

export default async function EquipmentRegisterPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:               equipment.id,
      code:             equipment.code,
      name:             equipment.name,
      type:             equipment.type,
      make:             equipment.make,
      model:            equipment.model,
      year:             equipment.year,
      purchaseValue:    equipment.purchaseValue,
      dailyRentalRate:  equipment.dailyRentalRate,
      status:           equipment.status,
      isFlaggedForFlip: equipment.isFlaggedForFlip,
    })
    .from(equipment)
    .orderBy(desc(equipment.createdAt));

  const totalAssetValue = rows.reduce((s, r) => s + (r.purchaseValue ? Number(r.purchaseValue) : 0), 0);
  const active = rows.filter((r) => r.status !== "DISPOSED").length;
  const fmt    = (v: number) => `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Motorpool</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Equipment Register</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>{active} active units · {rows.length} total</p>
          </div>
          <a href="/motorpool/add-equipment" style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT, color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>+ Add Equipment</a>
        </div>

        {/* Asset value KPIs — connected to Finance */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
          {[
            { label: "Fleet Asset Value", value: fmt(totalAssetValue), color: ACCENT, sub: "Sum of purchase prices" },
            { label: "Active Units",      value: String(active),       color: "#057a55", sub: "Operational fleet" },
            { label: "Flagged for Flip",  value: String(rows.filter((r) => r.isFlaggedForFlip).length), color: "#b45309", sub: "Recommended for disposal" },
          ].map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.1rem 1.25rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>{k.label}</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.1rem" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "1.25rem", fontSize: "0.82rem", color: "#6b7280" }}>
          Fleet asset values are visible in{" "}
          <a href="/finance/chart-of-accounts" style={{ color: ACCENT, fontWeight: 600 }}>Chart of Accounts</a> and{" "}
          <a href="/finance/cost-center" style={{ color: ACCENT, fontWeight: 600 }}>Fleet Cost Center</a>.
          {" "}Purchase ledger entries are created when equipment is assigned to a project.
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No equipment registered yet. <a href="/motorpool/add-equipment" style={{ color: ACCENT }}>Add first unit →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Code", "Equipment", "Type", "Year", "Purchase Value", "Daily Rate", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: [4, 5].includes(i) ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.8rem" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.AVAILABLE;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.status === "DISPOSED" ? 0.5 : 1 }}>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: "#374151", fontSize: "0.82rem" }}>{r.code}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <div style={{ fontWeight: 500, color: "#111827" }}>{r.name}</div>
                          {(r.make || r.model) && <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{[r.make, r.model].filter(Boolean).join(" ")}</div>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontSize: "0.82rem" }}>{r.type}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.year ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: r.purchaseValue ? "#0694a2" : "#9ca3af" }}>
                          {r.purchaseValue ? fmt(Number(r.purchaseValue)) : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: "#374151" }}>
                          {fmt(Number(r.dailyRentalRate))}/day
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.15rem 0.45rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: st.bg, color: st.color }}>
                            {r.status}
                          </span>
                          {r.isFlaggedForFlip && (
                            <span style={{ marginLeft: "0.35rem", display: "inline-block", padding: "0.1rem 0.35rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700, background: "#fef9c3", color: "#713f12" }}>FLIP</span>
                          )}
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
