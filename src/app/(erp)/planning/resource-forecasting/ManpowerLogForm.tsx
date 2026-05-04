"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManpowerLog } from "@/actions/planning";

type Project  = { id: string; name: string };
type Activity = { id: string; activityCode: string; activityName: string };
type Subcon   = { id: string; name: string; code: string };

const ACCENT = "#1a56db";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function ManpowerLogForm({
  projects, activities, subcontractors,
}: {
  projects:       Project[];
  activities:     Activity[];
  subcontractors: Subcon[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createManpowerLog({
        projectId:        fd.get("projectId") as string,
        logDate:          fd.get("logDate") as string,
        activityDefId:    (fd.get("activityDefId") as string) || undefined,
        subconId:         (fd.get("subconId") as string) || undefined,
        subconHeadcount:  Number(fd.get("subconHeadcount")),
        directStaffCount: Number(fd.get("directStaffCount")),
        remarks:          (fd.get("remarks") as string) || undefined,
      });
      if (result.success) {
        router.push("/planning/resource-forecasting");
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Project <span style={{ color: "#e02424" }}>*</span></span>
          <select name="projectId" required style={inputStyle}
            value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Log Date <span style={{ color: "#e02424" }}>*</span></span>
          <input name="logDate" type="date" required style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Activity (optional)</span>
          <select name="activityDefId" style={inputStyle}>
            <option value="">Not specific…</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>[{a.activityCode}] {a.activityName}</option>
            ))}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Subcontractor (optional)</span>
          <select name="subconId" style={inputStyle}>
            <option value="">Direct staff only…</option>
            {subcontractors.map((s) => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Subcon Headcount <span style={{ color: "#e02424" }}>*</span></span>
          <input name="subconHeadcount" type="number" min="0" step="1" required defaultValue={0} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Direct Staff Count <span style={{ color: "#e02424" }}>*</span></span>
          <input name="directStaffCount" type="number" min="0" step="1" required defaultValue={0} style={inputStyle} />
        </label>
      </div>

      <label>
        <span style={labelStyle}>Remarks (optional)</span>
        <textarea name="remarks" rows={3} placeholder="Any notable observations or notes…"
          style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <a href="/planning/resource-forecasting" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#93c5fd" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem",
          fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Log Manpower"}
        </button>
      </div>
    </form>
  );
}
