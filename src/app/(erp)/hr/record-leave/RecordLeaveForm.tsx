"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordLeaveRequest } from "@/actions/hr";

type Employee = { id: string; employeeCode: string; fullName: string };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function RecordLeaveForm({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await recordLeaveRequest({
        employeeId: fd.get("employeeId") as string,
        leaveType:  fd.get("leaveType") as any,
        startDate:  fd.get("startDate") as string,
        endDate:    fd.get("endDate") as string,
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
          border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem",
        }}>{error}</div>
      )}

      <label>
        <span style={labelStyle}>Employee *</span>
        <select name="employeeId" required style={inputStyle}>
          <option value="">Select employee…</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.employeeCode} — {e.fullName}</option>)}
        </select>
      </label>

      <label>
        <span style={labelStyle}>Leave Type *</span>
        <select name="leaveType" required style={inputStyle}>
          <option value="VACATION">Vacation</option>
          <option value="SICK">Sick</option>
          <option value="EMERGENCY">Emergency</option>
          <option value="MATERNITY">Maternity</option>
          <option value="PATERNITY">Paternity</option>
          <option value="OTHER">Other</option>
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Start Date *</span>
          <input name="startDate" type="date" required style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>End Date *</span>
          <input name="endDate" type="date" required style={inputStyle} />
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
          {isPending ? "Submitting…" : "Submit Leave Request"}
        </button>
      </div>
    </form>
  );
}
