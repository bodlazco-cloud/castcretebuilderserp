"use client";

import { useState, useTransition } from "react";
import { createMixDesign } from "@/actions/batching-bom";

const ACCENT = "#1a56db";

interface Props {
  projects: { id: string; name: string }[];
  userId: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.5rem 0.65rem", border: "1px solid #d1d5db",
  borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

export function AddMixDesignForm({ projects, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const admixtureRaw = fd.get("admixtureLitersPerM3") as string;
    startTransition(async () => {
      setError(null);
      const res = await createMixDesign({
        projectId:            fd.get("projectId") as string,
        code:                 fd.get("code") as string,
        name:                 fd.get("name") as string,
        cementBagsPerM3:      parseFloat(fd.get("cementBagsPerM3") as string),
        sandKgPerM3:          parseFloat(fd.get("sandKgPerM3") as string),
        gravelKgPerM3:        parseFloat(fd.get("gravelKgPerM3") as string),
        gravelSpec:           (fd.get("gravelSpec") as string) || undefined,
        waterLitersPerM3:     parseFloat(fd.get("waterLitersPerM3") as string),
        admixtureLitersPerM3: admixtureRaw ? parseFloat(admixtureRaw) : undefined,
        createdBy:            userId,
      });
      if (res.success) {
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      } else {
        setError(res.error);
      }
    });
  }

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
            width: "100%", maxWidth: "560px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            maxHeight: "90vh", overflowY: "auto",
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
                  Design ratios per 1 m³ — used for theoretical yield calculations. Add full ingredient BOM after saving.
                </div>

                {/* Cement + Water */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={labelStyle}>Cement Bags / m³</label>
                    <input name="cementBagsPerM3" type="number" step="0.001" required min="0.001" placeholder="9.0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Water L / m³</label>
                    <input name="waterLitersPerM3" type="number" step="0.001" required min="0.001" placeholder="175" style={inputStyle} />
                  </div>
                </div>

                {/* Sand */}
                <div>
                  <label style={labelStyle}>Fine Aggregate — Sand kg / m³</label>
                  <input name="sandKgPerM3" type="number" step="0.001" required min="0.001" placeholder="700" style={inputStyle} />
                </div>

                {/* Coarse Aggregate */}
                <div style={{ padding: "0.85rem", background: "#f9fafb", borderRadius: "7px", border: "1px solid #e5e7eb", display: "grid", gap: "0.65rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Coarse Aggregate (Gravel)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                    <div>
                      <label style={labelStyle}>Total Gravel kg / m³</label>
                      <input name="gravelKgPerM3" type="number" step="0.001" required min="0.001" placeholder="1050" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Gravel Type / Specification</label>
                      <input name="gravelSpec" placeholder='e.g. 3/4" crushed + 1/2" pea gravel' style={inputStyle} />
                    </div>
                  </div>
                </div>

                {/* Admixture */}
                <div style={{ padding: "0.85rem", background: "#f9fafb", borderRadius: "7px", border: "1px solid #e5e7eb", display: "grid", gap: "0.65rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Chemical Admixture (optional)
                  </div>
                  <div>
                    <label style={labelStyle}>Admixture L / m³</label>
                    <input
                      name="admixtureLitersPerM3"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="e.g. 1.5 (superplasticizer, retarder, etc.)"
                      style={inputStyle}
                    />
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
