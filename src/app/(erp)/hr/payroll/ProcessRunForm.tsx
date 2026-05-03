"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type React from "react";
import { processPayrollRun } from "@/actions/hr";

type Dept = { id: string; name: string; code: string };

const ACCENT = "#7c3aed";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.55rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

export function ProcessRunForm({ departments }: { departments: Dept[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<{ dtrHours: number; loggedHours: number } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFlagged(null);
    const fd  = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await processPayrollRun({
        deptId:      fd.get("deptId")      as string,
        periodStart: fd.get("periodStart") as string,
        periodEnd:   fd.get("periodEnd")   as string,
      });

      if (result.success === true) {
        router.push(`/hr/payroll/${result.payrollRunId}`);
      } else if (result.success === "FLAGGED") {
        setFlagged({ dtrHours: result.dtrHours, loggedHours: result.loggedHours });
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && (
        <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}
      {flagged && (
        <div style={{ padding: "0.85rem 1rem", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "6px", fontSize: "0.875rem", color: "#92400e" }}>
          <strong>DTR Integrity Flag:</strong> DTR total ({flagged.dtrHours.toFixed(1)} hrs) exceeds
          site log total ({flagged.loggedHours.toFixed(1)} hrs). Resolve discrepancy before processing.
        </div>
      )}

      <label>
        <span style={labelStyle}>Department <span style={{ color: "#e02424" }}>*</span></span>
        <select name="deptId" required style={inputStyle}>
          <option value="">Select department…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label>
          <span style={labelStyle}>Period Start <span style={{ color: "#e02424" }}>*</span></span>
          <input name="periodStart" type="date" required style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Period End <span style={{ color: "#e02424" }}>*</span></span>
          <input name="periodEnd"   type="date" required style={inputStyle} />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.6rem 1.25rem", borderRadius: "6px", border: "none",
          background: isPending ? "#a78bfa" : ACCENT, color: "#fff",
          fontSize: "0.875rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
          alignSelf: "flex-start",
        }}
      >
        {isPending ? "Processing…" : "Process Payroll Run"}
      </button>
    </form>
  );
}
