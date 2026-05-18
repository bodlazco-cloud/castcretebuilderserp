"use client";

import { useState, useTransition } from "react";
import { createInternalPO } from "@/actions/batching-bom";

const ACCENT = "#1a56db";

interface Props {
  projects: { id: string; name: string }[];
  mixDesigns: { id: string; code: string; name: string }[];
  units: { id: string; unitLabel: string; projectId: string }[];
  userId: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.5rem 0.65rem", border: "1px solid #d1d5db",
  borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

export function CreateIPOForm({ projects, mixDesigns, units, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUnits = selectedProject
    ? units.filter((u) => u.projectId === selectedProject)
    : units;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      const rateRaw = fd.get("internalRatePerM3") as string;
      const res = await createInternalPO({
        projectId:         fd.get("projectId") as string,
        unitId:            fd.get("unitId") as string,
        mixDesignId:       fd.get("mixDesignId") as string,
        requestedVolumeM3: parseFloat(fd.get("requestedVolumeM3") as string),
        internalRatePerM3: rateRaw ? parseFloat(rateRaw) : undefined,
        triggeredBy:       (fd.get("triggeredBy") as string) || undefined,
        requestedBy:       userId || undefined,
        notes:             (fd.get("notes") as string) || undefined,
      });
      if (res.success) {
        setSuccess(`IPO created: ${res.ipoNumber}`);
        setTimeout(() => { setOpen(false); setSuccess(null); }, 1800);
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
        + New IPO
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div style={{
            background: "#fff", borderRadius: "12px", padding: "1.75rem",
            width: "100%", maxWidth: "540px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            maxHeight: "90vh", overflowY: "auto",
          }}>
            <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
              Create Internal Purchase Order
            </h2>

            {success ? (
              <div style={{ padding: "1rem", background: "#ecfdf5", color: "#065f46", borderRadius: "8px", textAlign: "center", fontWeight: 600 }}>
                {success}
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gap: "1rem" }}>
                  <div>
                    <label style={labelStyle}>Project</label>
                    <select name="projectId" required style={inputStyle}
                      onChange={(e) => setSelectedProject(e.target.value)}>
                      <option value="">Select project…</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Site Unit</label>
                    <select name="unitId" required style={inputStyle}>
                      <option value="">Select unit…</option>
                      {filteredUnits.map((u) => <option key={u.id} value={u.id}>{u.unitLabel}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Mix Design</label>
                    <select name="mixDesignId" required style={inputStyle}>
                      <option value="">Select mix design…</option>
                      {mixDesigns.map((m) => (
                        <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={labelStyle}>Requested Volume (m³)</label>
                      <input name="requestedVolumeM3" type="number" step="0.01" min="0.01" required placeholder="45.00" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Internal Rate / m³ (₱)</label>
                      <input name="internalRatePerM3" type="number" step="0.01" min="0" placeholder="e.g. 4500.00" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Trigger Reason</label>
                    <input name="triggeredBy" placeholder="UNIT_READY_FOR_POUR / Manual" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Notes</label>
                    <textarea name="notes" rows={2} placeholder="Additional instructions…" style={{ ...inputStyle, resize: "vertical" }} />
                  </div>

                  {error && (
                    <div style={{ padding: "0.65rem 0.85rem", background: "#fef2f2", color: "#dc2626", borderRadius: "6px", fontSize: "0.82rem" }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
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
                      {isPending ? "Creating…" : "Create IPO"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
