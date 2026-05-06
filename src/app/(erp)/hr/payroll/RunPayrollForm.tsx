"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generatePayrollRun } from "@/actions/hr";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

export function RunPayrollForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 8) + "01";

  const [periodStart, setPeriodStart] = useState(firstOfMonth);
  const [periodEnd,   setPeriodEnd]   = useState(today);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null);
    startTransition(async () => {
      const result = await generatePayrollRun({ periodStart, periodEnd });
      if (result.success) {
        setSuccess(`Generated ${result.created} payroll record(s) for ${periodStart} → ${periodEnd}.`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#374151",
        color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
      }}>⚙ Run Payroll</button>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div style={{
        background: "#fff", borderRadius: "10px", padding: "1.75rem",
        width: "100%", maxWidth: "420px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
        fontFamily: "system-ui, sans-serif",
      }}>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>Run Payroll</h2>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "#6b7280" }}>
          Generates payroll records for all active employees based on DTR logs for the selected period.
          Already-processed periods are skipped.
        </p>

        {error && (
          <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: "0.75rem 1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", color: "#166534", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label>
              <span style={labelStyle}>Period Start *</span>
              <input type="date" required value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)} style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Period End *</span>
              <input type="date" required value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
            <button type="button" onClick={() => { setOpen(false); setError(null); setSuccess(null); }} style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#f3f4f6",
              color: "#374151", border: "1px solid #d1d5db", fontSize: "0.875rem", cursor: "pointer",
            }}>Close</button>
            <button type="submit" disabled={isPending} style={{
              padding: "0.55rem 1.25rem", borderRadius: "6px",
              background: isPending ? "#9ca3af" : "#374151",
              color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600,
              cursor: isPending ? "not-allowed" : "pointer",
            }}>{isPending ? "Processing…" : "Generate"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
