"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitWorkAccomplishedReport } from "@/actions/construction";

type Project = { id: string; name: string };
type Unit = { id: string; unitCode: string; projectId: string };
type Assignment = { id: string; unitId: string; subconName: string; category: string };
type Milestone = { id: string; unitId: string; milestoneName: string; status: string };

const ACCENT = "#057a55";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function SubmitWarForm({ projects, units, assignments, milestones, userId }: {
  projects: Project[];
  units: Unit[];
  assignments: Assignment[];
  milestones: Milestone[];
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  const filteredUnits = units.filter((u) => u.projectId === selectedProject);
  const filteredAssignments = assignments.filter((a) => a.unitId === selectedUnit);
  const filteredMilestones = milestones.filter((m) => m.unitId === selectedUnit && m.status === "PENDING");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitWorkAccomplishedReport({
        projectId:           fd.get("projectId") as string,
        unitId:              fd.get("unitId") as string,
        unitMilestoneId:     fd.get("unitMilestoneId") as string,
        taskAssignmentId:    fd.get("taskAssignmentId") as string,
        grossAccomplishment: Number(fd.get("grossAccomplishment")),
        submittedBy:         userId,
      });
      if (result.success) {
        router.push("/construction");
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
          border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem",
        }}>{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Project *</span>
          <select name="projectId" required style={inputStyle}
            value={selectedProject}
            onChange={(e) => { setSelectedProject(e.target.value); setSelectedUnit(""); }}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Unit *</span>
          <select name="unitId" required style={inputStyle}
            value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}
            disabled={!selectedProject}>
            <option value="">Select unit…</option>
            {filteredUnits.map((u) => <option key={u.id} value={u.id}>{u.unitCode}</option>)}
          </select>
        </label>
      </div>

      <label>
        <span style={labelStyle}>Task Assignment (NTP) *</span>
        <select name="taskAssignmentId" required style={inputStyle} disabled={!selectedUnit}>
          <option value="">Select assignment…</option>
          {filteredAssignments.map((a) => (
            <option key={a.id} value={a.id}>{a.subconName} — {a.category}</option>
          ))}
        </select>
      </label>

      <label>
        <span style={labelStyle}>Billing Milestone *</span>
        <select name="unitMilestoneId" required style={inputStyle} disabled={!selectedUnit}>
          <option value="">Select milestone…</option>
          {filteredMilestones.map((m) => (
            <option key={m.id} value={m.id}>{m.milestoneName}</option>
          ))}
          {selectedUnit && filteredMilestones.length === 0 && (
            <option value="" disabled>No pending milestones for this unit</option>
          )}
        </select>
      </label>

      <label>
        <span style={labelStyle}>Gross Accomplishment (PHP) *</span>
        <input name="grossAccomplishment" type="number" min="0" step="0.01" required style={inputStyle} placeholder="0.00" />
      </label>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/construction" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#6ee7b7" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Submitting…" : "Submit WAR"}
        </button>
      </div>
    </form>
  );
}
