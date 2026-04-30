"use client";

import { useState, useTransition } from "react";
import { createProject } from "@/actions/master-list";
import { useRouter } from "next/navigation";

type Developer = { id: string; name: string };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

const PROJECT_STATUSES = ["BIDDING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

export function NewProjectForm({ devOptions }: { devOptions: Developer[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName]                         = useState("");
  const [developerId, setDeveloperId]           = useState("");
  const [contractValue, setContractValue]       = useState("");
  const [developerAdvance, setDeveloperAdvance] = useState("63750000");
  const [targetUnits, setTargetUnits]           = useState("120");
  const [cashBuffer, setCashBuffer]             = useState("5000000");
  const [status, setStatus]                     = useState<"BIDDING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED">("BIDDING");
  const [startDate, setStartDate]               = useState("");
  const [endDate, setEndDate]                   = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!developerId) { setError("Please select a developer."); return; }
    startTransition(async () => {
      const result = await createProject({
        name,
        developerId,
        contractValue:          Number(contractValue),
        developerAdvance:       Number(developerAdvance),
        targetUnitsPerMonth:    Number(targetUnits),
        minOperatingCashBuffer: Number(cashBuffer),
        status,
        startDate:  startDate || undefined,
        endDate:    endDate   || undefined,
      });
      if (result.success) {
        router.push(`/master-list/projects/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      <label>
        <span style={labelStyle}>Project Name *</span>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Camella Homes Batangas Phase 2" style={inputStyle} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Developer *</span>
          <select required value={developerId} onChange={(e) => setDeveloperId(e.target.value)} style={inputStyle}>
            <option value="">Select developer…</option>
            {devOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Status *</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} style={inputStyle}>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Contract Value (PHP) *</span>
          <input type="number" required min="0" step="0.01" value={contractValue}
            onChange={(e) => setContractValue(e.target.value)} placeholder="0.00" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Developer Advance (PHP)</span>
          <input type="number" min="0" step="0.01" value={developerAdvance}
            onChange={(e) => setDeveloperAdvance(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Target Units / Month</span>
          <input type="number" min="1" step="1" value={targetUnits}
            onChange={(e) => setTargetUnits(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Min. Operating Cash Buffer (PHP)</span>
          <input type="number" min="0" step="0.01" value={cashBuffer}
            onChange={(e) => setCashBuffer(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Start Date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>End Date</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/master-list/projects" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#a5b4fc" : "#6366f1",
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save Project"}
        </button>
      </div>
    </form>
  );
}
