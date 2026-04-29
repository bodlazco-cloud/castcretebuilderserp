"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logFuelConsumption } from "@/actions/motorpool";

type Equip = { id: string; code: string; name: string };
type Assignment = { id: string; equipmentId: string; projectName: string; assignedDate: string };

const ACCENT = "#d97706";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function LogFuelForm({ equipment, assignments, userId }: {
  equipment: Equip[];
  assignments: Assignment[];
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ isFlagged: boolean; variancePct: number } | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState("");

  const filteredAssignments = assignments.filter((a) => a.equipmentId === selectedEquipment);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await logFuelConsumption({
        equipmentId:        fd.get("equipmentId") as string,
        assignmentId:       fd.get("assignmentId") as string,
        logDate:            fd.get("logDate") as string,
        engineHoursStart:   Number(fd.get("engineHoursStart")),
        engineHoursEnd:     Number(fd.get("engineHoursEnd")),
        fuelConsumedLiters: Number(fd.get("fuelConsumedLiters")),
        operatorId:         userId,
      });
      if (res.success) {
        setResult({ isFlagged: res.isFlagged, variancePct: res.variancePct });
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
          background: result.isFlagged ? "#fef2f2" : "#f0fdf4",
          borderRadius: "8px", border: `1px solid ${result.isFlagged ? "#fecaca" : "#bbf7d0"}`,
          marginBottom: "1.5rem",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            {result.isFlagged ? "Fuel Log Flagged" : "Fuel Log Saved"}
          </div>
          <div style={{ color: result.isFlagged ? "#b91c1c" : "#057a55", fontSize: "0.9rem" }}>
            Variance: {result.variancePct > 0 ? "+" : ""}{result.variancePct.toFixed(1)}%
            {result.isFlagged && " — exceeds 20% threshold, flagged for review"}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button onClick={() => setResult(null)} style={{
            padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
            background: "#fff", color: "#374151", fontSize: "0.9rem", cursor: "pointer",
          }}>Log Another</button>
          <a href="/motorpool" style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: ACCENT, color: "#fff", fontSize: "0.9rem",
            fontWeight: 600, textDecoration: "none",
          }}>Back to Motorpool</a>
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
          <span style={labelStyle}>Equipment *</span>
          <select name="equipmentId" required style={inputStyle}
            value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)}>
            <option value="">Select equipment…</option>
            {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.code} — {eq.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Assignment (Project) *</span>
          <select name="assignmentId" required style={inputStyle} disabled={!selectedEquipment}>
            <option value="">Select assignment…</option>
            {filteredAssignments.map((a) => (
              <option key={a.id} value={a.id}>{a.projectName} (from {a.assignedDate})</option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span style={labelStyle}>Log Date *</span>
        <input name="logDate" type="date" required style={inputStyle}
          defaultValue={new Date().toISOString().slice(0, 10)} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Engine Hours Start *</span>
          <input name="engineHoursStart" type="number" min="0" step="0.01" required style={inputStyle} placeholder="0.00" />
        </label>
        <label>
          <span style={labelStyle}>Engine Hours End *</span>
          <input name="engineHoursEnd" type="number" min="0" step="0.01" required style={inputStyle} placeholder="0.00" />
        </label>
        <label>
          <span style={labelStyle}>Fuel Consumed (Liters) *</span>
          <input name="fuelConsumedLiters" type="number" min="0" step="0.01" required style={inputStyle} placeholder="0.00" />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/motorpool" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#fcd34d" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Log Fuel"}
        </button>
      </div>
    </form>
  );
}
