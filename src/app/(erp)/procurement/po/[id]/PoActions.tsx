"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { advancePoToAudit, bodApprovePo, markPoDelivered } from "@/actions/procurement";

export function PoActions({ poId, status }: { poId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.success) router.refresh();
      else setError(result.error ?? "Action failed.");
    });
  }

  const btnBase: React.CSSProperties = {
    padding: "0.6rem 1.4rem", borderRadius: "6px", border: "none",
    fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer",
  };

  return (
    <div>
      {error && <div style={{ color: "#b91c1c", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</div>}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {status === "DRAFT" && (
          <button
            onClick={() => run(() => advancePoToAudit(poId))}
            disabled={isPending}
            style={{ ...btnBase, background: isPending ? "#93c5fd" : "#1d4ed8", color: "#fff" }}>
            {isPending ? "Processing…" : "Send to Audit Review"}
          </button>
        )}
        {status === "AUDIT_REVIEW" && (
          <button
            onClick={() => run(() => bodApprovePo(poId))}
            disabled={isPending}
            style={{ ...btnBase, background: isPending ? "#86efac" : "#16a34a", color: "#fff" }}>
            {isPending ? "Approving…" : "BOD Approve → Release for Delivery"}
          </button>
        )}
        {(status === "AWAITING_DELIVERY" || status === "PARTIALLY_DELIVERED") && (
          <button
            onClick={() => run(() => markPoDelivered(poId))}
            disabled={isPending}
            style={{ ...btnBase, background: isPending ? "#fcd34d" : "#d97706", color: "#fff" }}>
            {isPending ? "Marking…" : "Mark as Delivered"}
          </button>
        )}
      </div>
    </div>
  );
}
