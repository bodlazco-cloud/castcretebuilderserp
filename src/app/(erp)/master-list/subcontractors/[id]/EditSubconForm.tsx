"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSubcontractor, toggleSubconActive } from "@/actions/master-list";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.5rem 0.75rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem",
};

const TRADE_TYPES = ["STRUCTURAL", "ARCHITECTURAL", "BOTH"] as const;
type TradeType = typeof TRADE_TYPES[number];

export function EditSubconForm({
  id,
  initial,
  isActive,
}: {
  id: string;
  initial: {
    code: string;
    name: string;
    tradeTypes: TradeType[];
    defaultMaxActiveUnits: number;
    manpowerBenchmark: number;
  };
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [code, setCode] = useState(initial.code);
  const [name, setName] = useState(initial.name);
  const [tradeTypes, setTradeTypes] = useState<TradeType[]>(initial.tradeTypes);
  const [maxUnits, setMaxUnits] = useState(initial.defaultMaxActiveUnits);
  const [benchmark, setBenchmark] = useState(initial.manpowerBenchmark);

  function toggleTrade(t: TradeType) {
    setSaved(false);
    setTradeTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (tradeTypes.length === 0) { setError("Select at least one trade type."); return; }
    startTransition(async () => {
      const result = await updateSubcontractor(id, {
        code, name, tradeTypes, defaultMaxActiveUnits: maxUnits, manpowerBenchmark: benchmark,
      });
      if (result.success) {
        setSaved(true);
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleToggle() {
    startToggle(async () => {
      await toggleSubconActive(id, !isActive);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <button onClick={() => setOpen(true)} style={{
          padding: "0.5rem 1rem", borderRadius: "6px", background: "#f3f4f6",
          color: "#374151", border: "1px solid #d1d5db", fontSize: "0.8rem",
          fontWeight: 600, cursor: "pointer",
        }}>
          Edit Details
        </button>
        <button onClick={handleToggle} disabled={isToggling} style={{
          padding: "0.5rem 1rem", borderRadius: "6px",
          background: isActive ? "#fef2f2" : "#f0fdf4",
          color: isActive ? "#b91c1c" : "#166534",
          border: `1px solid ${isActive ? "#fecaca" : "#86efac"}`,
          fontSize: "0.8rem", fontWeight: 600,
          cursor: isToggling ? "not-allowed" : "pointer",
        }}>
          {isToggling ? "…" : isActive ? "Deactivate" : "Reactivate"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.25rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
      <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151" }}>Edit Subcontractor Details</div>
      {error && <div style={{ padding: "0.6rem 0.85rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem" }}>{error}</div>}
      {saved && <div style={{ padding: "0.6rem 0.85rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", color: "#166534", fontSize: "0.8rem" }}>Saved.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
        <label><span style={labelStyle}>Code *</span>
          <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} style={inputStyle} />
        </label>
        <label><span style={labelStyle}>Name *</span>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div>
        <div style={labelStyle}>Trade Types *</div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {TRADE_TYPES.map((t) => (
            <label key={t} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem", cursor: "pointer" }}>
              <input type="checkbox" checked={tradeTypes.includes(t)} onChange={() => toggleTrade(t)} />
              {t}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label><span style={labelStyle}>Max Active Units *</span>
          <input type="number" required min={1} value={maxUnits} onChange={(e) => setMaxUnits(Number(e.target.value))} style={inputStyle} />
        </label>
        <label><span style={labelStyle}>Manpower Benchmark (workers/unit) *</span>
          <input type="number" required min={0} step={0.01} value={benchmark} onChange={(e) => setBenchmark(Number(e.target.value))} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button type="submit" disabled={isPending} style={{
          padding: "0.5rem 1rem", borderRadius: "6px",
          background: isPending ? "#a5b4fc" : "#6366f1",
          color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>{isPending ? "Saving…" : "Save Changes"}</button>
        <button type="button" onClick={() => setOpen(false)} style={{
          padding: "0.5rem 0.85rem", borderRadius: "6px", background: "#fff",
          border: "1px solid #d1d5db", color: "#374151", fontSize: "0.8rem", cursor: "pointer",
        }}>Cancel</button>
      </div>
    </form>
  );
}
