"use client";

import { useState, useTransition } from "react";
import { createProject, createProjectUnitModel } from "@/actions/master-list";
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

  const [unitModels, setUnitModels]   = useState<string[]>([]);
  const [modelInput, setModelInput]   = useState("");

  function addModel() {
    const val = modelInput.trim();
    if (!val || unitModels.includes(val)) { setModelInput(""); return; }
    setUnitModels((prev) => [...prev, val]);
    setModelInput("");
  }

  function removeModel(m: string) {
    setUnitModels((prev) => prev.filter((x) => x !== m));
  }

  function handleModelKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addModel(); }
  }

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
      if (!result.success) { setError(result.error); return; }

      // Create unit models for the new project
      for (const modelName of unitModels) {
        await createProjectUnitModel(result.id, { name: modelName });
      }

      router.push(`/master-list/projects/${result.id}`);
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

      {/* Unit Models */}
      <div>
        <div style={labelStyle}>Unit Models</div>
        <p style={{ margin: "0 0 0.6rem", fontSize: "0.8rem", color: "#6b7280" }}>
          Define the unit models for this project (e.g. Type A, 2BR Corner, Single). These will be referenced on block/unit entries, BOM, and BOQ.
        </p>
        {unitModels.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.6rem" }}>
            {unitModels.map((m) => (
              <span key={m} style={{
                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                padding: "0.25rem 0.6rem", borderRadius: "999px",
                background: "#eff6ff", color: "#1e40af", fontSize: "0.8rem", fontWeight: 600,
                border: "1px solid #bfdbfe",
              }}>
                {m}
                <button type="button" onClick={() => removeModel(m)} style={{
                  background: "none", border: "none", cursor: "pointer", color: "#93c5fd",
                  fontSize: "0.75rem", padding: 0, lineHeight: 1,
                }}>✕</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text" value={modelInput}
            onChange={(e) => setModelInput(e.target.value)}
            onKeyDown={handleModelKeyDown}
            placeholder="Type a model name and press Enter or Add"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={addModel} disabled={!modelInput.trim()} style={{
            padding: "0.6rem 1rem", borderRadius: "6px", background: "#6366f1",
            color: "#fff", border: "none", fontSize: "0.85rem", fontWeight: 600,
            cursor: modelInput.trim() ? "pointer" : "not-allowed",
            opacity: modelInput.trim() ? 1 : 0.6, whiteSpace: "nowrap",
          }}>Add</button>
        </div>
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
