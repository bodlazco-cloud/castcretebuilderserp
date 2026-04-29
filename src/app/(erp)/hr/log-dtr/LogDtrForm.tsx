"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logDailyTimeRecord } from "@/actions/hr";

type Employee = { id: string; employeeCode: string; fullName: string };
type CC = { id: string; code: string; name: string };
type Unit = { id: string; unitCode: string };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px",
  fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600,
  color: "#374151", marginBottom: "0.35rem",
};

export function LogDtrForm({ employees, costCenters, units }: {
  employees: Employee[];
  costCenters: CC[];
  units: Unit[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await logDailyTimeRecord({
        employeeId:    fd.get("employeeId") as string,
        workDate:      fd.get("workDate") as string,
        costCenterId:  fd.get("costCenterId") as string,
        unitId:        (fd.get("unitId") as string) || undefined,
        timeIn:        (fd.get("timeIn") as string) || undefined,
        timeOut:       (fd.get("timeOut") as string) || undefined,
        hoursWorked:   fd.get("hoursWorked") ? Number(fd.get("hoursWorked")) : undefined,
        overtimeHours: Number(fd.get("overtimeHours") || 0),
      });
      if (result.success) {
        router.push("/hr");
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
        }}>{error}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Employee *</span>
          <select name="employeeId" required style={inputStyle}>
            <option value="">Select employee…</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.employeeCode} — {e.fullName}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Work Date *</span>
          <input name="workDate" type="date" required style={inputStyle}
            defaultValue={new Date().toISOString().slice(0, 10)} />
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
          <span style={labelStyle}>Unit (optional)</span>
          <select name="unitId" style={inputStyle}>
            <option value="">None</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.unitCode}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Time In</span>
          <input name="timeIn" type="time" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Time Out</span>
          <input name="timeOut" type="time" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Hours Worked</span>
          <input name="hoursWorked" type="number" min="0" max="24" step="0.5" style={inputStyle} placeholder="8" />
        </label>
        <label>
          <span style={labelStyle}>Overtime Hrs</span>
          <input name="overtimeHours" type="number" min="0" step="0.5" style={inputStyle} placeholder="0" defaultValue="0" />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/hr" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#9ca3af" : "#374151",
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Log DTR"}
        </button>
      </div>
    </form>
  );
}
