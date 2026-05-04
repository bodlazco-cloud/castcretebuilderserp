"use client";

import { useTransition } from "react";
import { approvePayrollRun } from "@/actions/hr";

export default function ApproveButton({ runId }: { runId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const result = await approvePayrollRun({ runId });
      if (!result.success) alert(result.error);
    });
  }

  return (
    <button
      onClick={handleApprove}
      disabled={isPending}
      style={{
        padding: "0.5rem 1.25rem",
        background: isPending ? "#d1d5db" : "#16a34a",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        fontWeight: 600,
        fontSize: "0.875rem",
        cursor: isPending ? "not-allowed" : "pointer",
      }}
    >
      {isPending ? "Approving…" : "✓ Approve Run"}
    </button>
  );
}
