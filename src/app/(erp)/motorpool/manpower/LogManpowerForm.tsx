"use client";

import { useState, useTransition } from "react";
import { logFleetManpower } from "@/actions/motorpool";

type Employee  = { id: string; employeeCode: string; fullName: string; position: string; costCenterId: string };
type Equipment = { id: string; code: string; name: string };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

export function LogManpowerForm({
  employees, equipmentList, userId,
}: {
  employees: Employee[];
  equipmentList: Equipment[];
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [show,  setShow]  = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done,  setDone]  = useState(false);

  const [employeeId,   setEmployeeId]   = useState("");
  const [equipmentId,  setEquipmentId]  = useState("");
  const [logDate,      setLogDate]      = useState(new Date().toISOString().slice(0, 10));
  const [hoursWorked,  setHoursWorked]  = useState("8");
  const [overtimeHours, setOvertimeHours] = useState("0");

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  function reset() {
    setEmployeeId(""); setEquipmentId(""); setLogDate(new Date().toISOString().slice(0, 10));
    setHoursWorked("8"); setOvertimeHours("0"); setError(null); setDone(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setError(null);
    startTransition(async () => {
      const res = await logFleetManpower({
        logDate,
        employeeId,
        equipmentId: equipmentId || undefined,
        hoursWorked: parseFloat(hoursWorked),
        overtimeHours: parseFloat(overtimeHours) || 0,
        costCenterId: selectedEmployee.costCenterId,
        recordedBy: userId,
      });
      if (res.success) setDone(true);
      else setError(res.error);
    });
  }

  if (done) {
    return (
      <div style={{ padding: "1rem 1.25rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 700, color: "#1a56db", marginBottom: "0.5rem" }}>✓ Manpower Log Saved</div>
        <button onClick={() => { reset(); setShow(false); window.location.reload(); }} style={{
          padding: "0.5rem 1.25rem", borderRadius: "6px", border: "none",
          background: "#1a56db", color: "#fff", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
        }}>Done</button>
        <button onClick={reset} style={{
          marginLeft: "0.5rem", padding: "0.5rem 1.25rem", borderRadius: "6px",
          border: "1px solid #d1d5db", background: "#fff", fontSize: "0.82rem", cursor: "pointer",
        }}>Log Another</button>
      </div>
    );
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} style={{
        padding: "0.65rem 1.25rem", borderRadius: "6px", border: "none",
        background: "#1a56db", color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
      }}>
        + Log Manpower
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px",
      padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem",
      marginBottom: "1.5rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Log Fleet Manpower</h3>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
            Showing employees assigned to Motorpool in HR & Payroll
          </p>
        </div>
        <button type="button" onClick={() => { reset(); setShow(false); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.1rem" }}>✕</button>
      </div>

      {error && <div style={{ padding: "0.7rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>}

      {employees.length === 0 && (
        <div style={{ padding: "0.75rem 1rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "0.82rem", color: "#92400e" }}>
          No employees found in the Motorpool department. Add them in <a href="/hr/registry" style={{ color: "#1a56db" }}>HR &amp; Payroll → Employee Registry</a> with dept = Motorpool.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Employee * <span style={{ fontWeight: 400, color: "#9ca3af" }}>(from Motorpool dept)</span></span>
          <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={inputStyle}>
            <option value="">Select employee…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employeeCode} — {emp.fullName} ({emp.position})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Log Date *</span>
          <input type="date" required value={logDate} onChange={(e) => setLogDate(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Equipment (optional)</span>
          <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} style={inputStyle}>
            <option value="">None / General</option>
            {equipmentList.map((eq) => <option key={eq.id} value={eq.id}>{eq.code} — {eq.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Hours Worked *</span>
          <input type="number" min="0.5" max="24" step="0.5" required value={hoursWorked}
            onChange={(e) => setHoursWorked(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Overtime Hours</span>
          <input type="number" min="0" max="12" step="0.5" value={overtimeHours}
            onChange={(e) => setOvertimeHours(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => { reset(); setShow(false); }} style={{
          padding: "0.6rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          background: "#fff", color: "#374151", fontSize: "0.875rem", cursor: "pointer",
        }}>Cancel</button>
        <button type="submit" disabled={isPending || !employeeId} style={{
          padding: "0.6rem 1.5rem", borderRadius: "6px", border: "none",
          background: isPending || !employeeId ? "#93c5fd" : "#1a56db",
          color: "#fff", fontSize: "0.875rem", fontWeight: 600,
          cursor: isPending || !employeeId ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save Log"}
        </button>
      </div>
    </form>
  );
}
