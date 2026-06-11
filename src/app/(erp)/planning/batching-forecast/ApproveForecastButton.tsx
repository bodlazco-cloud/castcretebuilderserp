"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewForecastAsManager, approveForecastAsBod } from "@/actions/planning";

export function ApproveForecastButton({
  forecastId, status, canReview, canBodApprove,
}: {
  forecastId: string;
  status: string;
  canReview: boolean;
  canBodApprove: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.success) setError(result.error ?? "Error");
      else router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {error && <div style={{ fontSize: "0.7rem", color: "#b91c1c" }}>{error}</div>}
      {status === "PENDING_APPROVAL" && canReview && (
        <button disabled={isPending} onClick={() => run(() => reviewForecastAsManager(forecastId))}
          style={{ fontSize: "0.78rem", padding: "0.25rem 0.6rem", borderRadius: "4px", background: "#fef9c3", color: "#713f12", border: "1px solid #fde047", cursor: isPending ? "not-allowed" : "pointer", fontWeight: 600 }}>
          {isPending ? "…" : "Review →BOD"}
        </button>
      )}
      {status === "PENDING_APPROVAL" && !canReview && (
        <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>Awaiting Planning Mgr</span>
      )}
      {status === "PENDING_BOD_APPROVAL" && canBodApprove && (
        <button disabled={isPending} onClick={() => run(() => approveForecastAsBod(forecastId))}
          style={{ fontSize: "0.78rem", padding: "0.25rem 0.6rem", borderRadius: "4px", background: "#dcfce7", color: "#166534", border: "1px solid #86efac", cursor: isPending ? "not-allowed" : "pointer", fontWeight: 600 }}>
          {isPending ? "…" : "BOD Approve"}
        </button>
      )}
      {status === "PENDING_BOD_APPROVAL" && !canBodApprove && (
        <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>Awaiting BOD</span>
      )}
    </div>
  );
}
