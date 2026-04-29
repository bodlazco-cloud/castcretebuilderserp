"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyMilestone } from "@/actions/audit";

export function MilestoneVerifyButton({ milestoneId }: { milestoneId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle() {
    setError(null);
    startTransition(async () => {
      const result = await verifyMilestone(milestoneId);
      if (result.success) router.refresh();
      else setError(result.error ?? "Failed.");
    });
  }

  return (
    <div>
      {error && <div style={{ color: "#b91c1c", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</div>}
      <button
        onClick={handle}
        disabled={isPending}
        style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#c4b5fd" : "#7e3af2",
          color: "#fff", border: "none", fontWeight: 600,
          fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer",
        }}>
        {isPending ? "Verifying…" : "Mark as Verified"}
      </button>
    </div>
  );
}
