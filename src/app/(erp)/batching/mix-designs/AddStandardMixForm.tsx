"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStandardMix } from "@/actions/batching";

type Project   = { id: string; name: string };
type MixDesign = { id: string; code: string; name: string };
type UnitModel = { projectId: string; unitModel: string };

const ACCENT = "#e02424";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

export function AddStandardMixForm({ projects, mixDesigns, unitModels }: {
  projects:   Project[];
  mixDesigns: MixDesign[];
  unitModels: UnitModel[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [projectId,       setProjectId]       = useState("");
  const [unitModel,       setUnitModel]       = useState("");
  const [unitType,        setUnitType]        = useState<"BEG" | "REG" | "END">("REG");
  const [mixDesignId,     setMixDesignId]     = useState("");
  const [volumePerUnit,   setVolumePerUnit]   = useState("");
  const [description,     setDescription]     = useState("");

  const projectUnitModels = Array.from(
    new Set(unitModels.filter((u) => u.projectId === projectId).map((u) => u.unitModel))
  );

  function reset() {
    setProjectId(""); setUnitModel(""); setUnitType("REG");
    setMixDesignId(""); setVolumePerUnit(""); setDescription(""); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!projectId || !unitModel) { setError("Project and unit model are required."); return; }
    startTransition(async () => {
      const result = await createStandardMix({
        projectId,
        unitModel,
        unitType,
        mixDesignId:    mixDesignId || undefined,
        volumePerUnitM3: volumePerUnit ? Number(volumePerUnit) : undefined,
        description:    description || undefined,
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
      }}>+ Add Standard Mix</button>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div style={{
        background: "#fff", borderRadius: "10px", padding: "1.75rem",
        width: "100%", maxWidth: "500px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
        fontFamily: "system-ui, sans-serif",
      }}>
        <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>
          Add Standard Mix
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
              onChange={(e) => { setProjectId(e.target.value); setUnitModel(""); }}
              style={inputStyle}>
              <option value="">Select project…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          {/* Unit Model + Unit Type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label>
              <span style={labelStyle}>Unit Model *</span>
              {projectUnitModels.length > 0 ? (
                <select required value={unitModel} onChange={(e) => setUnitModel(e.target.value)} style={inputStyle} disabled={!projectId}>
                  <option value="">Select model…</option>
                  {projectUnitModels.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input type="text" required value={unitModel} onChange={(e) => setUnitModel(e.target.value)}
                  placeholder="e.g. Type A" style={inputStyle} />
              )}
            </label>
            <label>
              <span style={labelStyle}>Unit Type *</span>
              <select required value={unitType} onChange={(e) => setUnitType(e.target.value as typeof unitType)} style={inputStyle}>
                <option value="BEG">BEG — Beginning</option>
                <option value="REG">REG — Regular</option>
                <option value="END">END — End</option>
              </select>
            </label>
          </div>

          {/* Mix Design */}
          <label>
            <span style={labelStyle}>Mix Design</span>
            <select value={mixDesignId} onChange={(e) => setMixDesignId(e.target.value)} style={inputStyle}>
              <option value="">— No specific mix design —</option>
              {mixDesigns.map((m) => <option key={m.id} value={m.id}>[{m.code}] {m.name}</option>)}
            </select>
          </label>

          {/* Volume + Description */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
            <label>
              <span style={labelStyle}>Volume / Unit (m³)</span>
              <input type="number" min="0.0001" step="0.0001" value={volumePerUnit}
                onChange={(e) => setVolumePerUnit(e.target.value)}
                placeholder="0.0000" style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Description</span>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes…" style={inputStyle} />
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
            }}>{isPending ? "Saving…" : "Save Mix"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
