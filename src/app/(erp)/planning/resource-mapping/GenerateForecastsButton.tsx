"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateForecastsForNtp } from "@/actions/planning";

export function GenerateForecastsButton({ ntpId }: { ntpId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateForecastsForNtp(ntpId);
      if (!result.success) setError(result.error ?? "Error");
      else { setDone(true); router.refresh(); }
    });
  }

  if (done) return (
    <div style={{ padding: "0.5rem 0.85rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", fontSize: "0.82rem", color: "#166534", fontWeight: 600 }}>
      ✓ Forecasts generated — check MRP Queue &amp; Batching Forecast in Planning.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      {error && <div style={{ fontSize: "0.78rem", color: "#b91c1c" }}>{error}</div>}
      <button disabled={isPending} onClick={handleClick}
        style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}>
        {isPending ? "Generating…" : "⟳ Generate Resource Forecasts"}
      </button>
      <p style={{ margin: 0, fontSize: "0.72rem", color: "#9ca3af" }}>
        Creates MRP and Batching forecast lines from approved BOM entries.
      </p>
    </div>
  );
}
