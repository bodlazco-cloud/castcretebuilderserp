"use client";

import { useState, useTransition } from "react";
import { createDeployment, endDeployment } from "@/actions/motorpool";

type Equipment  = { id: string; code: string; name: string; status: string; monthlyRate?: string };
type Department = { id: string; code: string; name: string };
type Project    = { id: string; name: string };

const ACCENT = "#1a56db";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

export function NewDeploymentForm({
  equipmentList, departments, projects, userId,
}: {
  equipmentList: Equipment[];
  departments: Department[];
  projects: Project[];
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [show, setShow]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone]   = useState(false);

  const [equipmentId, setEquipmentId]       = useState("");
  const [deptId, setDeptId]                 = useState("");
  const [projectId, setProjectId]           = useState("");
  const [monthlyRate, setMonthlyRate]       = useState("");
  const [startDate, setStartDate]           = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]                   = useState("");

  const availableEquip = equipmentList.filter((e) => e.status === "AVAILABLE");

  function reset() {
    setEquipmentId(""); setDeptId(""); setProjectId("");
    setMonthlyRate(""); setStartDate(new Date().toISOString().slice(0, 10));
    setNotes(""); setError(null); setDone(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createDeployment({
        equipmentId,
        deployedToDeptId: deptId,
        projectId: projectId || undefined,
        monthlyRate: parseFloat(monthlyRate),
        startDate,
        notes: notes || undefined,
        approvedBy: userId,
      });
      if (res.success) { setDone(true); }
      else { setError(res.error); }
    });
  }

  if (done) {
    return (
      <div style={{ padding: "1rem 1.25rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, color: ACCENT, marginBottom: "0.5rem" }}>✓ Deployment Created</div>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "#374151" }}>
          Monthly billing will auto-post on the 1st of each month.
        </p>
        <button onClick={() => { reset(); setShow(false); window.location.reload(); }} style={{
          padding: "0.5rem 1.25rem", borderRadius: "6px", border: "none",
          background: ACCENT, color: "#fff", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
        }}>Done</button>
      </div>
    );
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} style={{
        padding: "0.65rem 1.25rem", borderRadius: "6px", border: "none",
        background: ACCENT, color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
      }}>
        + New Deployment
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px",
      padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.1rem",
      marginBottom: "1.5rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>New Equipment Deployment</h3>
        <button type="button" onClick={() => { reset(); setShow(false); }} style={{
          background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.1rem",
        }}>✕</button>
      </div>

      {error && (
        <div style={{ padding: "0.7rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Equipment *</span>
          <select required value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} style={inputStyle}>
            <option value="">Select equipment…</option>
            {availableEquip.map((eq) => <option key={eq.id} value={eq.id}>{eq.code} — {eq.name}</option>)}
          </select>
          {equipmentList.length !== availableEquip.length && (
            <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>Only AVAILABLE machines shown.</span>
          )}
        </label>
        <label>
          <span style={labelStyle}>Deploy To Department *</span>
          <select required value={deptId} onChange={(e) => setDeptId(e.target.value)} style={inputStyle}>
            <option value="">Select department…</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Monthly Rate (₱) *</span>
          <input type="number" min="1" step="0.01" required value={monthlyRate}
            onChange={(e) => setMonthlyRate(e.target.value)} placeholder="e.g. 25000" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Start Date *</span>
          <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Linked Project (optional)</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
            <option value="">None</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>

      <label>
        <span style={labelStyle}>Notes</span>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Concrete mixer for Batching Plant operations" style={inputStyle} maxLength={500} />
      </label>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => { reset(); setShow(false); }} style={{
          padding: "0.6rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          background: "#fff", color: "#374151", fontSize: "0.875rem", cursor: "pointer",
        }}>Cancel</button>
        <button type="submit" disabled={isPending || !equipmentId || !deptId || !monthlyRate} style={{
          padding: "0.6rem 1.5rem", borderRadius: "6px", border: "none",
          background: isPending || !equipmentId || !deptId || !monthlyRate ? "#93c5fd" : ACCENT,
          color: "#fff", fontSize: "0.875rem", fontWeight: 600,
          cursor: isPending || !equipmentId || !deptId || !monthlyRate ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Creating…" : "Create Deployment"}
        </button>
      </div>
    </form>
  );
}

export function EndDeploymentButton({ deploymentId }: { deploymentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  if (confirm) {
    return (
      <span style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem", border: "1px solid #d1d5db", borderRadius: "4px" }} />
        <button disabled={isPending} onClick={() => startTransition(async () => {
          await endDeployment(deploymentId, endDate);
          window.location.reload();
        })} style={{
          padding: "0.25rem 0.65rem", fontSize: "0.75rem", borderRadius: "4px", border: "none",
          background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 600,
        }}>
          {isPending ? "…" : "Confirm End"}
        </button>
        <button onClick={() => setConfirm(false)} style={{
          padding: "0.25rem 0.5rem", fontSize: "0.75rem", borderRadius: "4px",
          border: "1px solid #d1d5db", background: "#fff", cursor: "pointer",
        }}>Cancel</button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirm(true)} style={{
      padding: "0.25rem 0.65rem", fontSize: "0.75rem", borderRadius: "4px",
      border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", cursor: "pointer",
    }}>
      End
    </button>
  );
}
