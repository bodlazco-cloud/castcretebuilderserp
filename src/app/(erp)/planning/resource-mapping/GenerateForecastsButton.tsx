"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateForecastsForNtp } from "@/actions/planning";

export function GenerateForecastsButton({ ntpId }: { ntpId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [created, setCreated] = useState(0);
  const [reasons, setReasons] = useState<string[]>([]);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateForecastsForNtp(ntpId);
      if (!result.success) {
        setError(result.error ?? "Error");
      } else {
        setDone(true);
        setCreated(result.created);
        setReasons(result.diagnostics.filter((d) => d.created === 0 && d.reason).map((d) =>
          `${d.unitModel ?? ""}${d.unitType ? ` / ${d.unitType}` : ""}: ${d.reason}`
        ));
        router.refresh();
      }
    });
  }

  if (done) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <div style={{ padding: "0.5rem 0.85rem", background: created > 0 ? "#f0fdf4" : "#fffbeb", border: `1px solid ${created > 0 ? "#bbf7d0" : "#fde68a"}`, borderRadius: "6px", fontSize: "0.82rem", color: created > 0 ? "#166534" : "#92400e", fontWeight: 600 }}>
        {created > 0
          ? `✓ ${created} forecast line(s) generated — check MRP Queue & Batching Forecast in Planning.`
          : "No new forecast lines were generated."}
      </div>
      {reasons.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.75rem", color: "#92400e" }}>
          {reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
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
