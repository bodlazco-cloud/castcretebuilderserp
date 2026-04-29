"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueTaskAssignment } from "@/actions/construction";

type Project = { id: string; name: string; status: string };
type Unit = { id: string; unitCode: string; projectId: string; unitModel: string };
type Subcon = { id: string; name: string; code: string; tradeTypes: string[] };

const ACCENT = "#057a55";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px",
  fontSize: "0.9rem", boxSizing: "border-box", background: "#fff",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600,
  color: "#374151", marginBottom: "0.35rem",
};

export function IssueNtpForm({
  projects, units, subcontractors, userId,
}: {
  projects: Project[];
  units: Unit[];
  subcontractors: Subcon[];
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("");

  const filteredUnits = units.filter((u) => u.projectId === selectedProject);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await issueTaskAssignment({
        projectId:  fd.get("projectId") as string,
        unitId:     fd.get("unitId") as string,
        subconId:   fd.get("subconId") as string,
        category:   fd.get("category") as "STRUCTURAL" | "ARCHITECTURAL" | "TURNOVER",
        workType:   fd.get("workType") as "STRUCTURAL" | "ARCHITECTURAL" | "BOTH",
        startDate:  fd.get("startDate") as string,
        endDate:    fd.get("endDate") as string,
        issuedBy:   userId,
      });
      if (result.success) {
        router.push(`/construction/ntp/${result.taskAssignmentId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{
          padding: "0.85rem 1rem", background: "#fef2f2",
          border: "1px solid #fecaca", borderRadius: "6px",
          color: "#b91c1c", fontSize: "0.875rem",
        }}>
          {error}
        </div>
      )}

      <label>
        <span style={labelStyle}>Project <span style={{ color: "#e02424" }}>*</span></span>
        <select name="projectId" required value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)} style={inputStyle}>
          <option value="">Select project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {p.status}</option>
          ))}
        </select>
      </label>

      <label>
        <span style={labelStyle}>Unit <span style={{ color: "#e02424" }}>*</span></span>
        <select name="unitId" required style={inputStyle} disabled={!selectedProject}>
          <option value="">Select project first…</option>
          {filteredUnits.map((u) => (
            <option key={u.id} value={u.id}>{u.unitCode} — {u.unitModel}</option>
          ))}
        </select>
      </label>

      <label>
        <span style={labelStyle}>Subcontractor <span style={{ color: "#e02424" }}>*</span></span>
        <select name="subconId" required style={inputStyle}>
          <option value="">Select subcontractor…</option>
          {subcontractors.map((s) => (
            <option key={s.id} value={s.id}>{s.code} — {s.name} ({s.tradeTypes.join(", ")})</option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Category <span style={{ color: "#e02424" }}>*</span></span>
          <select name="category" required style={inputStyle}>
            <option value="STRUCTURAL">Structural</option>
            <option value="ARCHITECTURAL">Architectural</option>
            <option value="TURNOVER">Turnover</option>
          </select>
        </label>
        <label>
          <span style={labelStyle}>Work Type <span style={{ color: "#e02424" }}>*</span></span>
          <select name="workType" required style={inputStyle}>
            <option value="STRUCTURAL">Structural</option>
            <option value="ARCHITECTURAL">Architectural</option>
            <option value="BOTH">Both</option>
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Start Date <span style={{ color: "#e02424" }}>*</span></span>
          <input name="startDate" type="date" required style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>End Date <span style={{ color: "#e02424" }}>*</span></span>
          <input name="endDate" type="date" required style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <a href="/construction" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#6ee7b7" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem",
          fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Issuing NTP…" : "Issue NTP"}
        </button>
      </div>
    </form>
  );
}
