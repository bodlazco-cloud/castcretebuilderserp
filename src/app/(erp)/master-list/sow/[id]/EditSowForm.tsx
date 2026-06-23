"use client";

import { useState, useTransition } from "react";
import { updateActivityDefinition } from "@/actions/master-list";
import { useRouter } from "next/navigation";

type Activity = {
  id: string;
  projectId: string | null;
  category: string;
  scopeCode: string;
  scopeName: string;
  activityCode: string;
  activityName: string;
  standardDurationDays: number;
  weightInScopePct: string;
  sequenceOrder: number;
};
type Project = { id: string; name: string };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

type WorkCategory = "SLAB" | "STRUCTURAL" | "SPECIALTY_WORKS" | "MEPF" | "ARCHITECTURAL" | "TURNOVER";

export function EditSowForm({ activity, projects }: { activity: Activity; projects: Project[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId]         = useState(activity.projectId ?? "");
  const [category, setCategory]           = useState<WorkCategory>(activity.category as WorkCategory);
  const [scopeCode, setScopeCode]         = useState(activity.scopeCode);
  const [scopeName, setScopeName]         = useState(activity.scopeName);
  const [activityCode, setActivityCode]   = useState(activity.activityCode);
  const [activityName, setActivityName]   = useState(activity.activityName);
  const [durationDays, setDurationDays]   = useState(String(activity.standardDurationDays));
  const [weightPct, setWeightPct]         = useState(String(Number(activity.weightInScopePct).toFixed(2)));
  const [sequenceOrder, setSequenceOrder] = useState(String(activity.sequenceOrder));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateActivityDefinition(activity.id, {
        projectId,
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
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Error saving.");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        padding: "0.5rem 1rem", borderRadius: "6px", background: "#f3f4f6",
        color: "#374151", border: "1px solid #d1d5db", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
      }}>Edit</button>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#fff", borderRadius: "10px", padding: "1.75rem", width: "100%", maxWidth: "600px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", fontFamily: "system-ui, sans-serif", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>Edit Scope Item</h2>

        {error && (
          <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem", marginBottom: "1rem" }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
            <label>
              <span style={labelStyle}>Project *</span>
              <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
                <option value="">Select project…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Category *</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as WorkCategory)} style={inputStyle}>
                <option value="SLAB">SLAB</option>
                <option value="STRUCTURAL">STRUCTURAL</option>
                <option value="SPECIALTY_WORKS">SPECIALTY WORKS</option>
                <option value="MEPF">MEPF</option>
                <option value="ARCHITECTURAL">ARCHITECTURAL</option>
                <option value="TURNOVER">TURNOVER</option>
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
            <label>
              <span style={labelStyle}>Scope Code *</span>
              <input type="text" required value={scopeCode} onChange={(e) => setScopeCode(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Scope Name *</span>
              <input type="text" required value={scopeName} onChange={(e) => setScopeName(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
            <label>
              <span style={labelStyle}>Activity Code</span>
              <input type="text" value={activityCode} onChange={(e) => setActivityCode(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Activity Name</span>
              <input type="text" value={activityName} onChange={(e) => setActivityName(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <label>
              <span style={labelStyle}>Std. Duration (days) *</span>
              <input type="number" required min="1" step="1" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Weight in Scope (%)</span>
              <input type="number" min="0" max="100" step="0.01" value={weightPct} onChange={(e) => setWeightPct(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Sequence Order *</span>
              <input type="number" required min="1" step="1" value={sequenceOrder} onChange={(e) => setSequenceOrder(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button type="button" onClick={() => setOpen(false)} style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", fontSize: "0.875rem", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={isPending} style={{ padding: "0.55rem 1.25rem", borderRadius: "6px", background: isPending ? "#a5b4fc" : "#6366f1", color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}>
              {isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
