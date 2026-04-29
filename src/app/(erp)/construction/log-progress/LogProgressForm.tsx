"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logDailyProgress } from "@/actions/construction";

type Project = { id: string; name: string };
type Unit = { id: string; unitCode: string; projectId: string };
type Assignment = { id: string; unitId: string; subconId: string; subconName: string; category: string };
type Activity = { id: string; activityCode: string; activityName: string; unitId?: string };
type Subcon = { id: string; name: string };

const ACCENT = "#057a55";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px",
  fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600,
  color: "#374151", marginBottom: "0.35rem",
};

export function LogProgressForm({
  projects, units, assignments, activities, userId,
}: {
  projects: Project[];
  units: Unit[];
  assignments: Assignment[];
  activities: Activity[];
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  const filteredUnits = units.filter((u) => u.projectId === selectedProject);
  const filteredAssignments = assignments.filter((a) => a.unitId === selectedUnit);
  const filteredActivities = activities.filter((a) => !a.unitId || a.unitId === selectedUnit);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await logDailyProgress({
        projectId:        fd.get("projectId") as string,
        unitId:           fd.get("unitId") as string,
        taskAssignmentId: fd.get("taskAssignmentId") as string,
        unitActivityId:   fd.get("unitActivityId") as string,
        entryDate:        fd.get("entryDate") as string,
        subconId:         fd.get("subconId") as string,
        actualManpower:   Number(fd.get("actualManpower")),
        delayType:        (fd.get("delayType") as any) || undefined,
        issuesDetails:    (fd.get("issuesDetails") as string) || undefined,
        enteredBy:        userId,
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
          border: "1px solid #fecaca", borderRadius: "6px",
          color: "#b91c1c", fontSize: "0.875rem",
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Project *</span>
          <select name="projectId" required style={inputStyle}
            value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); setSelectedUnit(""); }}>
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
        <span style={labelStyle}>Subcontractor *</span>
        <select name="subconId" required style={inputStyle}>
          <option value="">Select subcontractor…</option>
          {filteredAssignments.map((a) => (
            <option key={a.subconId} value={a.subconId}>{a.subconName}</option>
          ))}
        </select>
      </label>

      <label>
        <span style={labelStyle}>Activity *</span>
        <select name="unitActivityId" required style={inputStyle}>
          <option value="">Select activity…</option>
          {filteredActivities.map((a) => (
            <option key={a.id} value={a.id}>{a.activityCode} — {a.activityName}</option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Entry Date *</span>
          <input name="entryDate" type="date" required style={inputStyle}
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label>
          <span style={labelStyle}>Actual Manpower *</span>
          <input name="actualManpower" type="number" min="0" required style={inputStyle} placeholder="0" />
        </label>
      </div>

      <label>
        <span style={labelStyle}>Delay Type (if any)</span>
        <select name="delayType" style={inputStyle}>
          <option value="">None</option>
          <option value="WEATHER">Weather</option>
          <option value="MATERIAL_DELAY">Material Delay</option>
          <option value="MANPOWER_SHORTAGE">Manpower Shortage</option>
          <option value="EQUIPMENT_BREAKDOWN">Equipment Breakdown</option>
          <option value="DESIGN_CHANGE">Design Change</option>
          <option value="OTHER">Other</option>
        </select>
      </label>

      <label>
        <span style={labelStyle}>Issues / Details</span>
        <textarea name="issuesDetails" rows={3} style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Describe any issues or delays…" />
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
          {isPending ? "Saving…" : "Log Progress"}
        </button>
      </div>
    </form>
  );
}
