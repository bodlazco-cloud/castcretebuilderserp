"use client";

import { useState, useTransition } from "react";
import { updateActivityDefinition, toggleActivityDefinitionActive } from "@/actions/master-list";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

type Props = {
  id: string;
  isActive: boolean;
  initial: {
    category: "STRUCTURAL" | "ARCHITECTURAL" | "TURNOVER";
    scopeCode: string;
    scopeName: string;
    activityCode: string;
    activityName: string;
    standardDurationDays: number;
    weightInScopePct: string;
    sequenceOrder: number;
  };
};

export function EditSowForm({ id, isActive, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory]           = useState(initial.category);
  const [scopeCode, setScopeCode]         = useState(initial.scopeCode);
  const [scopeName, setScopeName]         = useState(initial.scopeName);
  const [activityCode, setActivityCode]   = useState(initial.activityCode);
  const [activityName, setActivityName]   = useState(initial.activityName);
  const [durationDays, setDurationDays]   = useState(String(initial.standardDurationDays));
  const [weightPct, setWeightPct]         = useState(Number(initial.weightInScopePct).toFixed(2));
  const [sequenceOrder, setSequenceOrder] = useState(String(initial.sequenceOrder));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateActivityDefinition(id, {
        category,
        scopeCode,
        scopeName,
        activityCode,
        activityName,
        standardDurationDays: Number(durationDays),
        weightInScopePct:     Number(weightPct),
        sequenceOrder:        Number(sequenceOrder),
      });
      if (result.success) {
        router.push(`/master-list/sow/${id}`);
      } else {
        setError(result.error);
      }
    });
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleActivityDefinitionActive(id, !isActive);
      router.push(`/master-list/sow/${id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      <label>
        <span style={labelStyle}>Category *</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} style={inputStyle}>
          <option value="STRUCTURAL">STRUCTURAL</option>
          <option value="ARCHITECTURAL">ARCHITECTURAL</option>
          <option value="TURNOVER">TURNOVER</option>
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Scope Code *</span>
          <input type="text" required value={scopeCode} onChange={(e) => setScopeCode(e.target.value)}
            placeholder="e.g. STR-001" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Scope Name *</span>
          <input type="text" required value={scopeName} onChange={(e) => setScopeName(e.target.value)}
            placeholder="e.g. Foundation Works" style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Activity Code *</span>
          <input type="text" required value={activityCode} onChange={(e) => setActivityCode(e.target.value)}
            placeholder="e.g. STR-001-A" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Activity Name *</span>
          <input type="text" required value={activityName} onChange={(e) => setActivityName(e.target.value)}
            placeholder="e.g. Excavation and Gravel Bedding" style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Std. Duration (days) *</span>
          <input type="number" required min="1" step="1" value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Weight in Scope (%)</span>
          <input type="number" min="0" max="100" step="0.01" value={weightPct}
            onChange={(e) => setWeightPct(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Sequence Order *</span>
          <input type="number" required min="1" step="1" value={sequenceOrder}
            onChange={(e) => setSequenceOrder(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid #e5e7eb" }}>
        <button type="button" onClick={handleToggle} disabled={isPending} style={{
          padding: "0.6rem 1.1rem", borderRadius: "6px",
          background: isActive ? "#fef2f2" : "#f0fdf4",
          color: isActive ? "#b91c1c" : "#166534",
          border: `1px solid ${isActive ? "#fecaca" : "#86efac"}`,
          fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isActive ? "Deactivate" : "Reactivate"}
        </button>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <a href={`/master-list/sow/${id}`} style={{
            padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
            color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
          }}>Cancel</a>
          <button type="submit" disabled={isPending} style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: isPending ? "#a5b4fc" : "#6366f1",
            color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
          }}>
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
