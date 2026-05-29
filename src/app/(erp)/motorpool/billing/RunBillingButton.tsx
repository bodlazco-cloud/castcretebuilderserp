"use client";

import { useState, useTransition } from "react";
import { runMonthlyBilling } from "@/actions/motorpool";

const ACCENT = "#1a56db";

export function RunBillingButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ posted: number; skipped: number; month: string } | null>(null);
  const [error, setError]   = useState<string | null>(null);

  function handleRun() {
    setError(null); setResult(null);
    startTransition(async () => {
      const res = await runMonthlyBilling();
      if (res.success) {
        setResult({ posted: res.posted, skipped: res.skipped, month: res.billingMonth });
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
      <button onClick={handleRun} disabled={isPending} style={{
        padding: "0.65rem 1.5rem", borderRadius: "6px", border: "none",
        background: isPending ? "#93c5fd" : ACCENT, color: "#fff",
        fontSize: "0.875rem", fontWeight: 600,
        cursor: isPending ? "not-allowed" : "pointer",
      }}>
        {isPending ? "Running…" : "▶ Run Monthly Billing Now"}
      </button>
      {result && (
        <div style={{ fontSize: "0.8rem", color: "#16a34a", textAlign: "right" }}>
          ✓ {result.month}: {result.posted} posted, {result.skipped} already billed (skipped)
        </div>
      )}
      {error && (
        <div style={{ fontSize: "0.8rem", color: "#dc2626" }}>{error}</div>
      )}
    </div>
  );
}
