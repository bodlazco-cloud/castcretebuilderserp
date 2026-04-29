"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEquipmentAssignment } from "@/actions/motorpool";

type Equip = { id: string; code: string; name: string; type: string };
type Project = { id: string; name: string };
type CC = { id: string; code: string; name: string };
type Unit = { id: string; unitCode: string; projectId: string };
type Operator = { id: string; fullName: string; employeeCode: string };

const ACCENT = "#0694a2";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function AssignEquipmentForm({ equipment, projects, costCenters, units, operators }: {
  equipment: Equip[];
  projects: Project[];
  costCenters: CC[];
  units: Unit[];
  operators: Operator[];
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
      const result = await createEquipmentAssignment({
        equipmentId:  fd.get("equipmentId") as string,
        projectId:    fd.get("projectId") as string,
        unitId:       (fd.get("unitId") as string) || undefined,
        costCenterId: fd.get("costCenterId") as string,
        operatorId:   fd.get("operatorId") as string,
        assignedDate: fd.get("assignedDate") as string,
        dailyRate:    Number(fd.get("dailyRate")),
      });
      if (result.success) {
        router.push("/motorpool");
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

      <label>
        <span style={labelStyle}>Equipment *</span>
        <select name="equipmentId" required style={inputStyle}>
          <option value="">Select equipment (AVAILABLE only)…</option>
          {equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.code} — {eq.name} ({eq.type})</option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Project *</span>
          <select name="projectId" required style={inputStyle}
            value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Unit (optional)</span>
          <select name="unitId" style={inputStyle} disabled={!selectedProject}>
            <option value="">None / General site use</option>
            {filteredUnits.map((u) => <option key={u.id} value={u.id}>{u.unitCode}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Cost Center *</span>
          <select name="costCenterId" required style={inputStyle}>
            <option value="">Select cost center…</option>
            {costCenters.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Operator *</span>
          <select name="operatorId" required style={inputStyle}>
            <option value="">Select operator…</option>
            {operators.map((o) => <option key={o.id} value={o.id}>{o.employeeCode} — {o.fullName}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Assigned Date *</span>
          <input name="assignedDate" type="date" required style={inputStyle}
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label>
          <span style={labelStyle}>Daily Rate (PHP) *</span>
          <input name="dailyRate" type="number" min="0" step="0.01" required style={inputStyle} placeholder="0.00" />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/motorpool" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#67e8f9" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Assigning…" : "Assign Equipment"}
        </button>
      </div>
    </form>
  );
}
