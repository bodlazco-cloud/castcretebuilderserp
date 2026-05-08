"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPunchListItem } from "@/actions/audit";

type Project = { id: string; name: string };
type Unit = { id: string; unitCode: string; projectId: string; blockName: string | null };

const ACCENT = "#7e3af2";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

const CATEGORIES = ["Structural", "Architectural", "MEP", "Finishing", "Waterproofing", "Safety", "Other"];

const TEMPLATES: Record<string, string[]> = {
  Structural:    ["Crack observed on slab", "Column alignment off", "Rebar exposure", "Concrete honeycombing"],
  Architectural: ["Tile misalignment", "Paint defect / blistering", "Door not plumb", "Window gap/leak"],
  MEP:           ["Electrical outlet not working", "Leaking pipe joint", "No water flow in unit"],
  Finishing:     ["Ceiling board loose", "Grout missing/cracked", "Skirting detached"],
  Waterproofing: ["Water seepage on wall", "Roof leak", "Balcony ponding"],
  Safety:        ["Missing fire exit signage", "Handrail not secure", "Exposed wiring"],
  Other:         [],
};

export function NewPunchListForm({
  projects,
  units,
}: {
  projects: Project[];
  units: Unit[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [itemText, setItemText] = useState("");

  const filteredUnits = units.filter((u) => u.projectId === selectedProject);
  const templates = TEMPLATES[selectedCategory] ?? [];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createPunchListItem({
        projectId: fd.get("projectId") as string,
        unitId:    (fd.get("unitId") as string) || undefined,
        item:      fd.get("item") as string,
        category:  fd.get("category") as string,
        dueDate:   (fd.get("dueDate") as string) || undefined,
      });
      if (result.success) router.push(`/audit/qa-punch-list/${result.id}`);
      else setError(result.error);
    });
  }

  return (
    <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {error && (
          <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label>
            <span style={labelStyle}>Project <span style={{ color: "#e02424" }}>*</span></span>
            <select name="projectId" required value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={inputStyle}>
              <option value="">Select project…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>
            <span style={labelStyle}>Unit (optional)</span>
            <select name="unitId" style={inputStyle} disabled={!selectedProject}>
              <option value="">No specific unit</option>
              {filteredUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unitCode}{u.blockName ? ` — ${u.blockName}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span style={labelStyle}>Category <span style={{ color: "#e02424" }}>*</span></span>
          <select name="category" required value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={inputStyle}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        {templates.length > 0 && (
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.4rem" }}>Quick Templates:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {templates.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setItemText(t)}
                  style={{
                    padding: "0.25rem 0.65rem", borderRadius: "999px",
                    border: "1px solid #c4b5fd", background: itemText === t ? "#7e3af2" : "#f5f3ff",
                    color: itemText === t ? "#fff" : "#5b21b6",
                    fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <label>
          <span style={labelStyle}>Item / Defect Description <span style={{ color: "#e02424" }}>*</span></span>
          <textarea
            name="item" required rows={4}
            placeholder="Describe the quality issue in detail…"
            value={itemText}
            onChange={(e) => setItemText(e.target.value)}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>

        <label>
          <span style={labelStyle}>Due Date (optional)</span>
          <input name="dueDate" type="date" style={inputStyle} />
        </label>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <a href="/audit/qa-punch-list" style={{ padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db", color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Cancel</a>
          <button type="submit" disabled={isPending} style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: isPending ? "#c4b5fd" : ACCENT,
            color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
          }}>
            {isPending ? "Saving…" : "Add Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
