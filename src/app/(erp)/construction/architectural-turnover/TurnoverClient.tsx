"use client";

import { useState, useTransition } from "react";
import { recordArchitecturalTurnover } from "@/actions/turnover";
import { useRouter } from "next/navigation";

const ACCENT = "#1a56db";

const fmtPhp = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Unit = {
  id: string;
  unitCode: string;
  unitModel: string;
  blockName: string;
  lotNumber: string;
  contractPrice: string | null;
  projectName: string;
};

export default function TurnoverClient({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [turnoverDate, setTurnoverDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes]             = useState("");
  const [isPending, startTransition]  = useTransition();
  const [result, setResult]           = useState<{ count: number; cipCost: string; revenue: string } | null>(null);
  const [err, setErr]                 = useState("");

  function toggleAll() {
    if (selected.size === units.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(units.map((u) => u.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalRevenue = [...selected].reduce((s, id) => {
    const u = units.find((u) => u.id === id);
    return s + Number(u?.contractPrice ?? 0);
  }, 0);

  function handleSubmit() {
    if (selected.size === 0) return;
    setErr("");
    startTransition(async () => {
      const res = await recordArchitecturalTurnover({
        unitIds:      [...selected],
        turnoverDate,
        notes:        notes || undefined,
      });
      if (!res.success) {
        setErr(res.error);
      } else {
        setResult({ count: res.count, cipCost: res.totalCipCost, revenue: res.totalRevenue });
        router.refresh();
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    padding: "0.45rem 0.7rem", borderRadius: "6px",
    border: "1px solid #d1d5db", fontSize: "0.85rem",
  };

  if (result) {
    return (
      <div style={{ maxWidth: "680px", margin: "4rem auto", background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "2.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✓</div>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.3rem", fontWeight: 700, color: "#057a55" }}>
          {result.count} Units Turned Over
        </h2>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "2rem" }}>
          Turnover date: {turnoverDate}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "COGS Booked (CIP → Expense)", value: fmtPhp(Number(result.cipCost)), color: "#b91c1c" },
            { label: "Revenue Recognized",           value: fmtPhp(Number(result.revenue)), color: "#057a55" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "0.72rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", color }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <a href="/finance/reports/turnover-pnl" style={{
            padding: "0.6rem 1.25rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem",
          }}>
            View Board P&L →
          </a>
          <button onClick={() => { setResult(null); setSelected(new Set()); }}
            style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", fontSize: "0.875rem", cursor: "pointer" }}>
            Turn Over More Units
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
      </div>

      <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
        Architectural Turnover
      </h1>
      <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.875rem", paddingLeft: "1.25rem" }}>
        Select completed units to turn over. This books COGS and recognizes revenue in the Board P&L.
      </p>

      {units.length === 0 ? (
        <div style={{ padding: "3rem", background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", textAlign: "center", color: "#9ca3af" }}>
          No units in ARCHITECTURAL category available for turnover.
        </div>
      ) : (
        <>
          {/* Controls */}
          <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "1.25rem 1.5rem", marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>Turnover Date</label>
              <input type="date" value={turnoverDate} onChange={(e) => setTurnoverDate(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>Notes (optional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Phase 1 Block A completion"
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Summary bar */}
          {selected.size > 0 && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.85rem 1.25rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e40af" }}>
                {selected.size} unit{selected.size !== 1 ? "s" : ""} selected
              </span>
              <span style={{ fontSize: "0.875rem", color: "#1e40af" }}>
                Contract value: <strong>{fmtPhp(totalRevenue)}</strong>
              </span>
            </div>
          )}

          {/* Unit table */}
          <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: "1.5rem" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={{ padding: "0.7rem 1rem", textAlign: "left", borderBottom: "1px solid #e5e7eb", width: "40px" }}>
                      <input type="checkbox"
                        checked={selected.size === units.length && units.length > 0}
                        onChange={toggleAll}
                        style={{ cursor: "pointer" }} />
                    </th>
                    {["Unit Code", "Model", "Block", "Lot", "Project", "Contract Price"].map((h, i) => (
                      <th key={i} style={{ padding: "0.7rem 1rem", textAlign: i === 5 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => {
                    const isSelected = selected.has(u.id);
                    return (
                      <tr key={u.id}
                        onClick={() => toggle(u.id)}
                        style={{ borderBottom: "1px solid #f3f4f6", background: isSelected ? "#eff6ff" : "transparent", cursor: "pointer" }}>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggle(u.id)}
                            onClick={(e) => e.stopPropagation()} style={{ cursor: "pointer" }} />
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: "#111827", fontSize: "0.82rem" }}>{u.unitCode}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{u.unitModel}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{u.blockName}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{u.lotNumber}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{u.projectName}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "#111827" }}>
                          {u.contractPrice ? fmtPhp(Number(u.contractPrice)) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {err && (
            <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {err}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending || selected.size === 0}
            style={{
              padding: "0.7rem 1.75rem", borderRadius: "6px", fontSize: "0.9rem", fontWeight: 700, border: "none",
              background: selected.size === 0 || isPending ? "#9ca3af" : ACCENT,
              color: "#fff", cursor: selected.size === 0 || isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Processing…" : `Confirm Turnover (${selected.size} unit${selected.size !== 1 ? "s" : ""})`}
          </button>
        </>
      )}
    </div>
  );
}
