"use client";

import { useState, useTransition } from "react";
import { saveBomEntries } from "@/actions/planning";

type Project    = { id: string; name: string };
type Activity   = { id: string; projectId: string; scopeName: string; activityName: string; activityCode: string };
type Material   = { id: string; code: string; name: string; unit: string };

const ACCENT = "#1a56db";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

const UNIT_MODELS = ["Type A", "Type B", "Type C", "Type D", "Type E", "Type F", "Other"];
const UNIT_TYPES  = [
  { value: "BEG", label: "BEG — Beginning Unit" },
  { value: "REG", label: "REG — Regular Unit" },
  { value: "END", label: "END — End Unit" },
];

export function BomEntryForm({ projects, activities, materials }: {
  projects:   Project[];
  activities: Activity[];
  materials:  Material[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedProject,  setSelectedProject]  = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [unitModel,        setUnitModel]         = useState("");
  const [unitType,         setUnitType]          = useState("");
  const [lines, setLines] = useState([{ materialId: "", qty: "" }]);

  const filteredActivities = activities.filter((a) => a.projectId === selectedProject);

  function addLine()    { setLines((l) => [...l, { materialId: "", qty: "" }]); }
  function removeLine(i: number) { setLines((l) => l.filter((_, idx) => idx !== i)); }
  function setLine(i: number, field: "materialId" | "qty", val: string) {
    setLines((l) => l.map((line, idx) => idx === i ? { ...line, [field]: val } : line));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const items = lines
      .filter((l) => l.materialId && l.qty)
      .map((l) => ({ materialId: l.materialId, quantityPerUnit: Number(l.qty) }));

    if (!selectedActivity || !unitModel || !unitType || items.length === 0) {
      setError("Please fill in all required fields and at least one material line.");
      return;
    }

    startTransition(async () => {
      const result = await saveBomEntries({
        activityDefId: selectedActivity,
        unitModel,
        unitType: unitType as "BEG" | "REG" | "END",
        items,
      });
      if (result.success) {
        setSuccess(`Saved ${result.inserted} BOM line(s). Previous entries for this scope were versioned out.`);
        setLines([{ materialId: "", qty: "" }]);
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
      {success && (
        <div style={{ padding: "0.85rem 1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", color: "#166534", fontSize: "0.875rem" }}>
          {success}
        </div>
      )}

      {/* Scope selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Project / Site *</span>
          <select required style={inputStyle} value={selectedProject}
            onChange={(e) => { setSelectedProject(e.target.value); setSelectedActivity(""); }}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Scope of Work / Activity *</span>
          <select required style={inputStyle} value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            disabled={!selectedProject}>
            <option value="">Select activity…</option>
            {filteredActivities.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.activityCode}] {a.scopeName} → {a.activityName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Unit Model *</span>
          <select required style={inputStyle} value={unitModel} onChange={(e) => setUnitModel(e.target.value)}>
            <option value="">Select model…</option>
            {UNIT_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Unit Type *</span>
          <select required style={inputStyle} value={unitType} onChange={(e) => setUnitType(e.target.value)}>
            <option value="">Select type…</option>
            {UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>

      {/* Material lines */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Materials *</span>
          <button type="button" onClick={addLine} style={{
            padding: "0.35rem 0.85rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600,
            background: "#eff6ff", color: ACCENT, border: `1px solid ${ACCENT}`, cursor: "pointer",
          }}>+ Add Line</button>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Material</th>
                <th style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", width: "140px" }}>Qty / Unit</th>
                <th style={{ padding: "0.6rem 1rem", borderBottom: "1px solid #e5e7eb", width: "48px" }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} style={{ borderBottom: i < lines.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  <td style={{ padding: "0.5rem 1rem" }}>
                    <select value={line.materialId} onChange={(e) => setLine(i, "materialId", e.target.value)}
                      style={{ ...inputStyle, margin: 0 }}>
                      <option value="">Select material…</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.unit})</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "0.5rem 1rem" }}>
                    <input type="number" min="0.0001" step="0.0001" value={line.qty}
                      onChange={(e) => setLine(i, "qty", e.target.value)}
                      placeholder="0.0000"
                      style={{ ...inputStyle, margin: 0 }} />
                  </td>
                  <td style={{ padding: "0.5rem", textAlign: "center" }}>
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} style={{
                        background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "1rem", lineHeight: 1,
                      }}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/planning" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#93c5fd" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save BOM"}
        </button>
      </div>
    </form>
  );
}
