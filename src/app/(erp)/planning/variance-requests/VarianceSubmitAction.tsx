"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitVarianceRequest } from "@/actions/planning";

export function VarianceSubmitAction({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitVarianceRequest(id);
      if (result.success) {
        setDone(true);
        router.refresh();
      } else {
        setError(result.error ?? "Failed.");
      }
    });
  }

  if (done) return <span style={{ color: "#713f12", fontSize: "0.72rem", fontWeight: 600 }}>Submitted ✓</span>;
  if (error) return <span style={{ color: "#b91c1c", fontSize: "0.72rem" }}>{error}</span>;

  return (
    <button
      onClick={handleSubmit}
      disabled={isPending}
      style={{
        padding: "0.2rem 0.6rem", borderRadius: "4px",
        background: isPending ? "#e5e7eb" : "#fef9c3",
        color: isPending ? "#9ca3af" : "#713f12",
        border: "1px solid #fde68a", fontSize: "0.72rem",
        fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {isPending ? "…" : "Submit for Review"}
    </button>
  );
}
