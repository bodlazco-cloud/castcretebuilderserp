"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { runFixOrFlipAssessment } from "@/actions/motorpool";

export default function RunAssessmentButton({ equipmentId }: { equipmentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  function handleRun() {
    setResult(null);
    startTransition(async () => {
      const res = await runFixOrFlipAssessment({ equipmentId });
      if (res.success) {
        setResult(res.recommendation);
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  }

  return (
    <button
      onClick={handleRun}
      disabled={isPending}
      style={{
        padding: "0.35rem 0.85rem",
        background: isPending ? "#e5e7eb" : "#f8fafc",
        color: isPending ? "#9ca3af" : "#374151",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        fontSize: "0.78rem",
        fontWeight: 600,
        cursor: isPending ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {isPending ? "Assessing…" : result ? `✓ ${result}` : "Run Assessment"}
    </button>
  );
}
