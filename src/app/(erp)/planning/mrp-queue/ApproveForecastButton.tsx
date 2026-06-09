"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveForecast } from "@/actions/planning";

export function ApproveForecastButton({ forecastId }: { forecastId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveForecast(forecastId);
      if (!result.success) setError(result.error ?? "Error");
      else router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {error && <div style={{ fontSize: "0.7rem", color: "#b91c1c" }}>{error}</div>}
      <button
        disabled={isPending}
        onClick={handleApprove}
        style={{
          fontSize: "0.78rem", padding: "0.25rem 0.6rem", borderRadius: "4px",
          background: "#fef9c3", color: "#713f12", border: "1px solid #fde047",
          cursor: isPending ? "not-allowed" : "pointer", fontWeight: 600,
        }}>
        {isPending ? "…" : "✓ Approve"}
      </button>
    </div>
  );
}
