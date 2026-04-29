"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addEmployee } from "@/actions/hr";

type Dept = { id: string; code: string; name: string };
type CC = { id: string; code: string; name: string };

const ACCENT = "#6b7280";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px",
  fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600,
  color: "#374151", marginBottom: "0.35rem",
};

export function AddEmployeeForm({
  departments, costCenters,
}: {
  departments: Dept[];
  costCenters: CC[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addEmployee({
        employeeCode:           fd.get("employeeCode") as string,
        fullName:               fd.get("fullName") as string,
        deptId:                 fd.get("deptId") as string,
        costCenterId:           fd.get("costCenterId") as string,
        position:               fd.get("position") as string,
        employmentType:         fd.get("employmentType") as any,
        dailyRate:              Number(fd.get("dailyRate")),
        sssContribution:        Number(fd.get("sssContribution") || 0),
        philhealthContribution: Number(fd.get("philhealthContribution") || 0),
        pagibigContribution:    Number(fd.get("pagibigContribution") || 0),
        hireDate:               fd.get("hireDate") as string,
        tinNumber:              (fd.get("tinNumber") as string) || undefined,
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Employee Code *</span>
          <input name="employeeCode" required style={inputStyle} placeholder="EMP-001" />
        </label>
        <label>
          <span style={labelStyle}>Full Name *</span>
          <input name="fullName" required style={inputStyle} placeholder="Juan Dela Cruz" />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Department *</span>
          <select name="deptId" required style={inputStyle}>
            <option value="">Select department…</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Cost Center *</span>
          <select name="costCenterId" required style={inputStyle}>
            <option value="">Select cost center…</option>
            {costCenters.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Position *</span>
          <input name="position" required style={inputStyle} placeholder="Site Engineer" />
        </label>
        <label>
          <span style={labelStyle}>Employment Type *</span>
          <select name="employmentType" required style={inputStyle}>
            <option value="REGULAR">Regular</option>
            <option value="CONTRACTUAL">Contractual</option>
            <option value="PROJECT_BASED">Project-Based</option>
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Hire Date *</span>
          <input name="hireDate" type="date" required style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>TIN Number</span>
          <input name="tinNumber" style={inputStyle} placeholder="000-000-000-000" />
        </label>
      </div>

      <div style={{
        padding: "1rem", background: "#f9fafb", borderRadius: "6px",
        border: "1px solid #e5e7eb",
      }}>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
          Compensation & Contributions
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          <label>
            <span style={labelStyle}>Daily Rate (PHP) *</span>
            <input name="dailyRate" type="number" min="0" step="0.01" required style={inputStyle} placeholder="0.00" />
          </label>
          <label>
            <span style={labelStyle}>SSS</span>
            <input name="sssContribution" type="number" min="0" step="0.01" style={inputStyle} placeholder="0.00" defaultValue="0" />
          </label>
          <label>
            <span style={labelStyle}>PhilHealth</span>
            <input name="philhealthContribution" type="number" min="0" step="0.01" style={inputStyle} placeholder="0.00" defaultValue="0" />
          </label>
          <label>
            <span style={labelStyle}>Pag-IBIG</span>
            <input name="pagibigContribution" type="number" min="0" step="0.01" style={inputStyle} placeholder="0.00" defaultValue="0" />
          </label>
        </div>
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
          {isPending ? "Saving…" : "Add Employee"}
        </button>
      </div>
    </form>
  );
}
