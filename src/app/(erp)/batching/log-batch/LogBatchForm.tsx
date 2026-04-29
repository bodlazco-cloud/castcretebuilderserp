"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logBatchProduction } from "@/actions/batching";

type Project = { id: string; name: string };
type MixDesign = { id: string; code: string; name: string };

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ isFlagged: boolean; yieldVariancePct: number; flagReason?: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await logBatchProduction({
        projectId:        fd.get("projectId") as string,
        mixDesignId:      fd.get("mixDesignId") as string,
        batchDate:        fd.get("batchDate") as string,
        shift:            fd.get("shift") as "AM" | "PM" | "NIGHT",
        cementUsedBags:   Number(fd.get("cementUsedBags")),
        sandUsedKg:       Number(fd.get("sandUsedKg")),
        gravelUsedKg:     Number(fd.get("gravelUsedKg")),
        volumeProducedM3: Number(fd.get("volumeProducedM3")),
        operatorId:       userId,
      });
      if (res.success) {
        setResult({ isFlagged: res.isFlagged, yieldVariancePct: res.yieldVariancePct, flagReason: res.flagReason });
      } else {
        setError(res.error);
      }
    });
  }

  if (result) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0" }}>
        <div style={{
          display: "inline-block", padding: "1.5rem 2rem",
          background: result.isFlagged ? "#fef2f2" : "#f5f3ff",
          borderRadius: "8px", border: `1px solid ${result.isFlagged ? "#fecaca" : "#ddd6fe"}`,
          marginBottom: "1.5rem",
        }}>
          <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem", fontWeight: 600 }}>
            {result.isFlagged ? "Batch Flagged for Audit" : "Batch Logged"}
          </div>
          <div style={{ color: result.isFlagged ? "#b91c1c" : "#6d28d9", fontSize: "0.9rem" }}>
            Yield variance: {result.yieldVariancePct > 0 ? "+" : ""}{result.yieldVariancePct.toFixed(2)}%
            {result.flagReason && <div style={{ marginTop: "0.25rem" }}>{result.flagReason}</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button onClick={() => setResult(null)} style={{
            padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
            background: "#fff", color: "#374151", fontSize: "0.9rem", cursor: "pointer",
          }}>Log Another</button>
          <a href="/batching" style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: ACCENT, color: "#fff", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none",
          }}>Back to Batching</a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{
          padding: "0.85rem 1rem", background: "#fef2f2",
          border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem",
        }}>{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Project *</span>
          <select name="projectId" required style={inputStyle}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Mix Design *</span>
          <select name="mixDesignId" required style={inputStyle}>
            <option value="">Select mix design…</option>
            {mixDesigns.map((m) => (
              <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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

      <div style={{
        padding: "1rem", background: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb",
      }}>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
          Raw Material Inputs
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          <label>
            <span style={labelStyle}>Cement (bags) *</span>
            <input name="cementUsedBags" type="number" min="0" step="0.1" required style={inputStyle} placeholder="0" />
          </label>
          <label>
            <span style={labelStyle}>Sand (kg) *</span>
            <input name="sandUsedKg" type="number" min="0" step="0.1" required style={inputStyle} placeholder="0" />
          </label>
          <label>
            <span style={labelStyle}>Gravel (kg) *</span>
            <input name="gravelUsedKg" type="number" min="0" step="0.1" required style={inputStyle} placeholder="0" />
          </label>
          <label>
            <span style={labelStyle}>Volume Produced (m³) *</span>
            <input name="volumeProducedM3" type="number" min="0" step="0.01" required style={inputStyle} placeholder="0.00" />
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/batching" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#c4b5fd" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Log Batch"}
        </button>
      </div>
    </form>
  );
}
