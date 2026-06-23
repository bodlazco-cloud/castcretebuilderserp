"use client";

import { useState, useTransition } from "react";
import { createActivityDefinition } from "@/actions/master-list";
import { useRouter, useSearchParams } from "next/navigation";

type Project      = { id: string; name: string };
type PhaseCat     = { id: string; code: string; name: string };
type PhaseScope   = { id: string; categoryId: string; code: string; name: string };
type PhaseActivity = {
  id: string; scopeId: string; code: string; name: string;
  standardDurationDays: number; weightInScopePct: string | number; sequenceOrder: number;
};

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

type WorkCategory = "SLAB" | "STRUCTURAL" | "SPECIALTY_WORKS" | "MEPF" | "ARCHITECTURAL" | "TURNOVER";
const CATEGORY_MAP: Record<string, WorkCategory> = {
  SLAB: "SLAB", STRUCTURAL: "STRUCTURAL", SPECIALTY_WORKS: "SPECIALTY_WORKS",
  MEPF: "MEPF", ARCHITECTURAL: "ARCHITECTURAL", TURNOVER: "TURNOVER",
};

export function NewSowForm({ projects, phaseCats, phaseScps, phaseActs }: {
  projects:   Project[];
  phaseCats:  PhaseCat[];
  phaseScps:  PhaseScope[];
  phaseActs:  PhaseActivity[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultProject = searchParams.get("projectId") ?? "";

  const [projectId, setProjectId]         = useState(defaultProject);
  const [category, setCategory]           = useState<WorkCategory>("STRUCTURAL");
  const [scopeCode, setScopeCode]         = useState("");
  const [scopeName, setScopeName]         = useState("");
  const [activityCode, setActivityCode]   = useState("");
  const [activityName, setActivityName]   = useState("");
  const [durationDays, setDurationDays]   = useState("14");
  const [weightPct, setWeightPct]         = useState("0.00");
  const [sequenceOrder, setSequenceOrder] = useState("1");

  // Phase cascade state
  const [selCatId, setSelCatId]     = useState("");
  const [selScopeId, setSelScopeId] = useState("");
  const [selActId, setSelActId]     = useState("");

  const filteredScopes     = phaseScps.filter((s) => s.categoryId === selCatId);
  const filteredActivities = phaseActs.filter((a) => a.scopeId === selScopeId);

  function handleCatChange(catId: string) {
    setSelCatId(catId);
    setSelScopeId("");
    setSelActId("");
    const cat = phaseCats.find((c) => c.id === catId);
    if (cat && CATEGORY_MAP[cat.code]) setCategory(CATEGORY_MAP[cat.code]);
  }

  function handleScopeChange(scopeId: string) {
    setSelScopeId(scopeId);
    setSelActId("");
    const sc = phaseScps.find((s) => s.id === scopeId);
    if (sc) { setScopeCode(sc.code); setScopeName(sc.name); }
  }

  function handleActivityChange(actId: string) {
    setSelActId(actId);
    const act = phaseActs.find((a) => a.id === actId);
    if (!act) return;
    const sc = phaseScps.find((s) => s.id === act.scopeId);
    if (sc) { setScopeCode(sc.code); setScopeName(sc.name); }
    setActivityCode(act.code);
    setActivityName(act.name);
    setDurationDays(String(act.standardDurationDays));
    setWeightPct(String(act.weightInScopePct));
    setSequenceOrder(String(act.sequenceOrder));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!projectId) { setError("Please select a project."); return; }
    startTransition(async () => {
      const result = await createActivityDefinition({
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
        router.push(`/master-list/sow/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* Phase cascade — shown only if data exists */}
      {phaseCats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <label>
            <span style={labelStyle}>Phase Category</span>
            <select value={selCatId} onChange={(e) => handleCatChange(e.target.value)} style={inputStyle}>
              <option value="">Select phase category…</option>
              {phaseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            <span style={labelStyle}>Phase Scope</span>
            <select value={selScopeId} onChange={(e) => handleScopeChange(e.target.value)} style={inputStyle} disabled={!selCatId}>
              <option value="">Select phase scope…</option>
              {filteredScopes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>
            <span style={labelStyle}>Phase Activity</span>
            <select value={selActId} onChange={(e) => handleActivityChange(e.target.value)} style={inputStyle} disabled={!selScopeId}>
              <option value="">Select activity to auto-fill…</option>
              {filteredActivities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        </div>
      )}

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
          <span style={labelStyle}>Activity Code</span>
          <input type="text" value={activityCode} onChange={(e) => setActivityCode(e.target.value)}
            placeholder="e.g. STR-001-A" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Activity Name</span>
          <input type="text" value={activityName} onChange={(e) => setActivityName(e.target.value)}
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

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/master-list/sow" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#a5b4fc" : "#6366f1",
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save Scope Item"}
        </button>
      </div>
    </form>
  );
}
