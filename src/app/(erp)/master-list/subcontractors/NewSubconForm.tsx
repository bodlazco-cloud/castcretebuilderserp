"use client";

import { useState, useTransition } from "react";
import { createSubcontractor } from "@/actions/master-list";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

const TRADE_OPTIONS = [
  { value: "STRUCTURAL",    label: "Structural" },
  { value: "ARCHITECTURAL", label: "Architectural" },
  { value: "BOTH",          label: "Both" },
];

export function NewSubconForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [code, setCode]                       = useState("");
  const [name, setName]                       = useState("");
  const [tradeTypes, setTradeTypes]           = useState<string[]>([]);
  const [maxUnits, setMaxUnits]               = useState("10");
  const [manpower, setManpower]               = useState("1.00");

  function toggleTrade(val: string) {
    setTradeTypes((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (tradeTypes.length === 0) { setError("Select at least one trade type."); return; }
    startTransition(async () => {
      const result = await createSubcontractor({
        code, name,
        tradeTypes: tradeTypes as Array<"STRUCTURAL" | "ARCHITECTURAL" | "BOTH">,
        defaultMaxActiveUnits: Number(maxUnits),
        manpowerBenchmark: Number(manpower),
      });
      if (result.success) {
        router.push(`/master-list/subcontractors/${result.id}`);
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Code *</span>
          <input type="text" required value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. SC-001" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Subcontractor Name *</span>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Reyes Construction Group" style={inputStyle} />
        </label>
      </div>

      <div>
        <span style={labelStyle}>Trade Types *</span>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {TRADE_OPTIONS.map((opt) => (
            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
              <input type="checkbox" checked={tradeTypes.includes(opt.value)} onChange={() => toggleTrade(opt.value)} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Max Active Units (default)</span>
          <input type="number" min="1" step="1" value={maxUnits}
            onChange={(e) => setMaxUnits(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Manpower Benchmark (workers/unit)</span>
          <input type="number" min="0" step="0.01" value={manpower}
            onChange={(e) => setManpower(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/master-list/subcontractors" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#a5b4fc" : "#6366f1",
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save Subcontractor"}
        </button>
      </div>
    </form>
  );
}
