"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSubcontractor } from "@/actions/master-list";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.55rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

const TRADE_OPTIONS = [
  { value: "STRUCTURAL",    label: "Structural" },
  { value: "ARCHITECTURAL", label: "Architectural" },
  { value: "BOTH",          label: "Both" },
];

type Sub = {
  id: string; name: string; code: string;
  tradeTypes: string[];
  defaultMaxActiveUnits: number;
  manpowerBenchmark: string;
};

export function EditSubconForm({ sub }: { sub: Sub }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sub.name);
  const [code, setCode] = useState(sub.code);
  const [tradeTypes, setTradeTypes] = useState<string[]>(sub.tradeTypes);
  const [maxUnits, setMaxUnits] = useState(String(sub.defaultMaxActiveUnits));
  const [manpower, setManpower] = useState(sub.manpowerBenchmark);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleTrade(val: string) {
    setTradeTypes((prev) => prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (tradeTypes.length === 0) { setError("Select at least one trade type."); return; }
    startTransition(async () => {
      const result = await updateSubcontractor(sub.id, {
        code, name,
        tradeTypes:            tradeTypes as Array<"STRUCTURAL" | "ARCHITECTURAL" | "BOTH">,
        defaultMaxActiveUnits: Number(maxUnits),
        manpowerBenchmark:     Number(manpower),
      });
      if (result.success) { setOpen(false); router.refresh(); }
      else setError(result.error ?? "Error saving.");
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "0.5rem 1rem", borderRadius: "6px",
          background: open ? "#f3f4f6" : "#374151",
          color: open ? "#374151" : "#fff",
          border: open ? "1px solid #d1d5db" : "none",
          fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
        }}
      >
        {open ? "Cancel" : "Edit Subcontractor"}
      </button>

      {open && (
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginTop: "1rem" }}>
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Edit Subcontractor</h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
              <label>
                <span style={labelStyle}>Code *</span>
                <input required value={code} onChange={(e) => setCode(e.target.value)} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Name *</span>
                <input required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
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
                <span style={labelStyle}>Max Active Units</span>
                <input type="number" min="1" step="1" value={maxUnits} onChange={(e) => setMaxUnits(e.target.value)} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Manpower Benchmark (workers/unit)</span>
                <input type="number" min="0" step="0.01" value={manpower} onChange={(e) => setManpower(e.target.value)} style={inputStyle} />
              </label>
            </div>
            {error && (
              <div style={{ padding: "0.65rem 0.9rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem" }}>{error}</div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={isPending} style={{
                padding: "0.55rem 1.5rem", borderRadius: "6px", background: isPending ? "#9ca3af" : "#374151",
                color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
              }}>
                {isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
