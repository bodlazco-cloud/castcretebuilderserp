"use client";

import { useState, useTransition } from "react";
import { createMixDesign } from "@/actions/batching-bom";

const ACCENT = "#1a56db";

interface Props {
  projects: { id: string; name: string }[];
  userId: string;
}

export function AddMixDesignForm({ projects, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      const res = await createMixDesign({
        projectId:        fd.get("projectId") as string,
        code:             fd.get("code") as string,
        name:             fd.get("name") as string,
        cementBagsPerM3:  parseFloat(fd.get("cementBagsPerM3") as string),
        sandKgPerM3:      parseFloat(fd.get("sandKgPerM3") as string),
        gravelKgPerM3:    parseFloat(fd.get("gravelKgPerM3") as string),
        waterLitersPerM3: parseFloat(fd.get("waterLitersPerM3") as string),
        createdBy:        userId,
      });
      if (res.success) {
        setOpen(false);
      } else {
        setError(res.error);
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.65rem", border: "1px solid #d1d5db",
    borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "0.55rem 1rem", background: ACCENT, color: "#fff",
          border: "none", borderRadius: "7px", fontSize: "0.82rem",
          fontWeight: 600, cursor: "pointer",
        }}
      >
        + New Mix Design
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div style={{
            background: "#fff", borderRadius: "12px", padding: "1.75rem",
            width: "100%", maxWidth: "520px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}>
            <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
              New Mix Design
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Project</label>
                  <select name="projectId" required style={inputStyle}>
                    <option value="">Select project…</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={labelStyle}>Mix Code</label>
                    <input name="code" required placeholder="e.g. G3000_PSI_V1" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Description / Name</label>
                    <input name="name" required placeholder="3000 PSI Standard" style={inputStyle} />
                  </div>
                </div>
                <div style={{ padding: "0.75rem", background: "#eff6ff", borderRadius: "6px", fontSize: "0.78rem", color: "#1e40af" }}>
                  Legacy per-m³ design ratios (used for theoretical yield calc). Add detailed recipe BOM after saving.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={labelStyle}>Cement Bags / m³</label>
                    <input name="cementBagsPerM3" type="number" step="0.001" required min="0.001" placeholder="9.0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Sand kg / m³</label>
                    <input name="sandKgPerM3" type="number" step="0.001" required min="0.001" placeholder="700" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Gravel kg / m³</label>
                    <input name="gravelKgPerM3" type="number" step="0.001" required min="0.001" placeholder="1050" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Water liters / m³</label>
                    <input name="waterLitersPerM3" type="number" step="0.001" required min="0.001" placeholder="175" style={inputStyle} />
                  </div>
                </div>

                {error && (
                  <div style={{ padding: "0.65rem 0.85rem", background: "#fef2f2", color: "#dc2626", borderRadius: "6px", fontSize: "0.82rem" }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
                  <button type="button" onClick={() => setOpen(false)} style={{
                    padding: "0.5rem 1rem", background: "transparent", border: "1px solid #d1d5db",
                    borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer", color: "#374151",
                  }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isPending} style={{
                    padding: "0.5rem 1rem", background: ACCENT, color: "#fff",
                    border: "none", borderRadius: "6px", fontSize: "0.82rem",
                    fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1,
                  }}>
                    {isPending ? "Saving…" : "Create Mix Design"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
