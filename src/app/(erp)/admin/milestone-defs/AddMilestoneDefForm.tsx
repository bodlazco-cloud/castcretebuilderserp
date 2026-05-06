"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMilestoneDefinition } from "@/actions/master-list";

type Project = { id: string; name: string };
type Scope   = { id: string; projectId: string; scopeCode: string; scopeName: string; category: string };

const ACCENT = "#dc2626";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

type WorkCategory = "SLAB" | "STRUCTURAL" | "SPECIALTY_WORKS" | "MEPF" | "ARCHITECTURAL" | "TURNOVER";
const CATEGORIES: { value: WorkCategory; label: string }[] = [
  { value: "SLAB",           label: "Slab" },
  { value: "STRUCTURAL",     label: "Structural" },
  { value: "SPECIALTY_WORKS",label: "Specialty Works" },
  { value: "MEPF",           label: "MEPF" },
  { value: "ARCHITECTURAL",  label: "Architectural" },
  { value: "TURNOVER",       label: "Turnover" },
];

export function AddMilestoneDefForm({ projects, scopes }: {
  projects: Project[];
  scopes:   Scope[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [projectId,       setProjectId]       = useState("");
  const [scopeCode,       setScopeCode]       = useState("");
  const [name,            setName]            = useState("");
  const [category,        setCategory]        = useState<WorkCategory>("STRUCTURAL");
  const [sequenceOrder,   setSequenceOrder]   = useState("1");
  const [weightPct,       setWeightPct]       = useState("0");
  const [triggersBilling, setTriggersBilling] = useState(false);

  const projectScopes = scopes.filter((s) => s.projectId === projectId);
  const selectedScopeObj = projectScopes.find((s) => s.scopeCode === scopeCode);

  function reset() {
    setProjectId(""); setScopeCode(""); setName(""); setCategory("STRUCTURAL");
    setSequenceOrder("1"); setWeightPct("0"); setTriggersBilling(false); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!projectId) { setError("Select a project."); return; }
    startTransition(async () => {
      const result = await createMilestoneDefinition({
        projectId,
        scopeCode:  selectedScopeObj?.scopeCode,
        scopeName:  selectedScopeObj?.scopeName,
        name,
        category,
        sequenceOrder: Number(sequenceOrder),
        weightPct:     Number(weightPct),
        triggersBilling,
      });
      if (result.success) {
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
        color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
      }}>+ Add Milestone</button>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div style={{
        background: "#fff", borderRadius: "10px", padding: "1.75rem",
        width: "100%", maxWidth: "520px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
        fontFamily: "system-ui, sans-serif",
      }}>
        <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>
          Add Milestone Definition
        </h2>

        {error && (
          <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Project */}
          <label>
            <span style={labelStyle}>Project *</span>
            <select required value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setScopeCode(""); }}
              style={inputStyle}>
              <option value="">Select project…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          {/* Scope of Work */}
          <label>
            <span style={labelStyle}>Scope of Work</span>
            <select value={scopeCode} onChange={(e) => {
              setScopeCode(e.target.value);
              const sc = projectScopes.find((s) => s.scopeCode === e.target.value);
              if (sc) setCategory(sc.category as WorkCategory);
            }} style={inputStyle} disabled={!projectId}>
              <option value="">— Not linked to a specific scope —</option>
              {projectScopes.map((s) => (
                <option key={s.scopeCode} value={s.scopeCode}>{s.scopeName}</option>
              ))}
            </select>
            <span style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem", display: "block" }}>
              Selecting a scope links this milestone to that work package only.
            </span>
          </label>

          {/* Milestone Name */}
          <label>
            <span style={labelStyle}>Milestone Name *</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Foundation Complete, Roof Slab Poured…" style={inputStyle} />
          </label>

          {/* Category + Sequence */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label>
              <span style={labelStyle}>Category *</span>
              <select required value={category} onChange={(e) => setCategory(e.target.value as WorkCategory)} style={inputStyle}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Sequence Order *</span>
              <input type="number" required min="1" step="1" value={sequenceOrder}
                onChange={(e) => setSequenceOrder(e.target.value)} style={inputStyle} />
            </label>
          </div>

          {/* Weight + Billing trigger */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label>
              <span style={labelStyle}>Weight (%)</span>
              <input type="number" min="0" max="100" step="0.01" value={weightPct}
                onChange={(e) => setWeightPct(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <span style={labelStyle}>Billing Trigger</span>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0", cursor: "pointer" }}>
                <input type="checkbox" checked={triggersBilling} onChange={(e) => setTriggersBilling(e.target.checked)} />
                <span style={{ fontSize: "0.875rem", color: "#374151" }}>Triggers billing on completion</span>
              </label>
            </label>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button type="button" onClick={() => { setOpen(false); reset(); }} style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#f3f4f6",
              color: "#374151", border: "1px solid #d1d5db", fontSize: "0.875rem", cursor: "pointer",
            }}>Cancel</button>
            <button type="submit" disabled={isPending} style={{
              padding: "0.55rem 1.25rem", borderRadius: "6px",
              background: isPending ? "#fca5a5" : ACCENT,
              color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600,
              cursor: isPending ? "not-allowed" : "pointer",
            }}>{isPending ? "Saving…" : "Save Milestone"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
