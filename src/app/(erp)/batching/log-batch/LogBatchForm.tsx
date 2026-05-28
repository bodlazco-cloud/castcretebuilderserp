"use client";

import { useState, useTransition, useEffect } from "react";
import { logBatchProduction, type StockWarning } from "@/actions/batching";

type Project   = { id: string; name: string };
type MixDesign = {
  id: string; code: string; name: string;
  cementBagsPerM3: string; sandKgPerM3: string; gravelKgPerM3: string;
};

const ACCENT = "#7c3aed";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function LogBatchForm({ projects, mixDesigns, userId }: {
  projects: Project[];
  mixDesigns: MixDesign[];
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [result, setResult] = useState<{
    isFlagged: boolean; yieldVariancePct: number; flagReason?: string; stockWarnings: StockWarning[];
  } | null>(null);

  const [selectedMixId, setSelectedMixId] = useState("");
  const [plannedVolume,  setPlannedVolume] = useState("");
  const [cementBags,     setCementBags]    = useState("");
  const [sandKg,         setSandKg]        = useState("");
  const [gravelKg,       setGravelKg]      = useState("");
  const [actualVolume,   setActualVolume]  = useState("");

  // Auto-fill BOM quantities when mix + planned volume change
  useEffect(() => {
    const mix = mixDesigns.find((m) => m.id === selectedMixId);
    const vol = parseFloat(plannedVolume);
    if (!mix || isNaN(vol) || vol <= 0) return;
    setCementBags((Number(mix.cementBagsPerM3) * vol).toFixed(2));
    setSandKg((Number(mix.sandKgPerM3) * vol).toFixed(2));
    setGravelKg((Number(mix.gravelKgPerM3) * vol).toFixed(2));
    setActualVolume(plannedVolume);
  }, [selectedMixId, plannedVolume, mixDesigns]);

  const selectedMix = mixDesigns.find((m) => m.id === selectedMixId);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await logBatchProduction({
        projectId:        fd.get("projectId") as string,
        mixDesignId:      selectedMixId,
        batchDate:        fd.get("batchDate") as string,
        shift:            fd.get("shift") as "AM" | "PM" | "NIGHT",
        cementUsedBags:   Number(cementBags),
        sandUsedKg:       Number(sandKg),
        gravelUsedKg:     Number(gravelKg),
        volumeProducedM3: Number(actualVolume),
        operatorId:       userId,
      });
      if (res.success) {
        setResult({ isFlagged: res.isFlagged, yieldVariancePct: res.yieldVariancePct, flagReason: res.flagReason, stockWarnings: res.stockWarnings });
      } else {
        setError(res.error);
      }
    });
  }

  if (result) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{
          padding: "1.25rem 1.5rem",
          background: result.isFlagged ? "#fef2f2" : "#f5f3ff",
          borderRadius: "8px", border: `1px solid ${result.isFlagged ? "#fecaca" : "#ddd6fe"}`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.35rem" }}>
            {result.isFlagged ? "⚠ Batch Flagged for Audit" : "✓ Batch Logged"}
          </div>
          <div style={{ color: result.isFlagged ? "#b91c1c" : "#6d28d9", fontSize: "0.875rem" }}>
            Yield variance: {result.yieldVariancePct > 0 ? "+" : ""}{result.yieldVariancePct.toFixed(2)}%
          </div>
          {result.flagReason && (
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "#b91c1c" }}>{result.flagReason}</p>
          )}
        </div>

        {result.stockWarnings.length > 0 && (
          <div style={{ padding: "1rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", fontWeight: 700, color: "#92400e" }}>
              ⚠ Stock Warning — {result.stockWarnings.length} material{result.stockWarnings.length > 1 ? "s" : ""} below required level
            </p>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "#78350f" }}>
              Batch was saved. Coordinate with procurement to replenish.
            </p>
            <table style={{ width: "100%", fontSize: "0.75rem", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #fde68a" }}>
                  {["Material", "Needed", "Available", "Shortfall"].map((h, i) => (
                    <th key={h} style={{ padding: "0.2rem 0.4rem", textAlign: i > 0 ? "right" : "left", color: "#92400e", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.stockWarnings.map((w) => (
                  <tr key={w.materialName}>
                    <td style={{ padding: "0.2rem 0.4rem", color: "#78350f" }}>{w.materialName}</td>
                    <td style={{ padding: "0.2rem 0.4rem", textAlign: "right", fontFamily: "monospace" }}>{w.neededQty.toFixed(2)} {w.uom}</td>
                    <td style={{ padding: "0.2rem 0.4rem", textAlign: "right", fontFamily: "monospace" }}>{w.availableQty.toFixed(2)} {w.uom}</td>
                    <td style={{ padding: "0.2rem 0.4rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#dc2626" }}>-{w.shortfall.toFixed(2)} {w.uom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button
            onClick={() => {
              setResult(null); setSelectedMixId(""); setPlannedVolume("");
              setCementBags(""); setSandKg(""); setGravelKg(""); setActualVolume("");
            }}
            style={{ padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "0.9rem", cursor: "pointer" }}
          >
            Log Another
          </button>
          <a href="/batching/production" style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: ACCENT, color: "#fff", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none",
          }}>
            View Production Logs
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* Project + Date + Shift */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Project *</span>
          <select name="projectId" required style={inputStyle}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Batch Date *</span>
          <input name="batchDate" type="date" required style={inputStyle}
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label>
          <span style={labelStyle}>Shift *</span>
          <select name="shift" required style={inputStyle}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
            <option value="NIGHT">Night</option>
          </select>
        </label>
      </div>

      {/* Mix Design + Planned Volume */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Mix Design *</span>
          <select
            required
            value={selectedMixId}
            onChange={(e) => { setSelectedMixId(e.target.value); setPlannedVolume(""); }}
            style={inputStyle}
          >
            <option value="">Select mix design…</option>
            {mixDesigns.map((m) => (
              <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Planned Volume (m³) *</span>
          <input
            type="number" min="0.01" step="0.01" required
            value={plannedVolume}
            onChange={(e) => setPlannedVolume(e.target.value)}
            placeholder="e.g. 5.00"
            style={inputStyle}
          />
        </label>
      </div>

      {/* BOM reference */}
      {selectedMix && (
        <div style={{ padding: "0.65rem 1rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", fontSize: "0.78rem", color: "#1e40af" }}>
          <strong>Mix Design BOM:</strong>{" "}
          {selectedMix.cementBagsPerM3} bags cement / m³ &nbsp;·&nbsp;
          {selectedMix.sandKgPerM3} kg sand / m³ &nbsp;·&nbsp;
          {selectedMix.gravelKgPerM3} kg gravel / m³
        </div>
      )}

      {/* Raw materials — auto-filled from BOM, operator adjusts to actual */}
      {selectedMixId && plannedVolume && (
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>
              Actual Raw Materials Used
            </p>
            <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
              Auto-filled from BOM — adjust if actual differs
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            <label>
              <span style={labelStyle}>Cement Used (bags) *</span>
              <input type="number" min="0" step="0.01" required value={cementBags}
                onChange={(e) => setCementBags(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Sand Used (kg) *</span>
              <input type="number" min="0" step="0.1" required value={sandKg}
                onChange={(e) => setSandKg(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Gravel Used (kg) *</span>
              <input type="number" min="0" step="0.1" required value={gravelKg}
                onChange={(e) => setGravelKg(e.target.value)} style={inputStyle} />
            </label>
          </div>
        </div>
      )}

      {/* Actual volume produced */}
      {selectedMixId && plannedVolume && (
        <label>
          <span style={labelStyle}>Actual Volume Produced (m³) *</span>
          <input type="number" min="0.01" step="0.01" required value={actualVolume}
            onChange={(e) => setActualVolume(e.target.value)} style={inputStyle} />
          <span style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.25rem", display: "block" }}>
            Adjust if the actual poured volume differs from planned. Variance &gt;2% auto-flags to Audit.
          </span>
        </label>
      )}

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/batching/production" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button
          type="submit"
          disabled={isPending || !selectedMixId || !plannedVolume}
          style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: isPending || !selectedMixId || !plannedVolume ? "#c4b5fd" : ACCENT,
            color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
            cursor: isPending || !selectedMixId || !plannedVolume ? "not-allowed" : "pointer",
          }}
        >
          {isPending ? "Saving…" : "Log Batch"}
        </button>
      </div>
    </form>
  );
}
