"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteRowButton({ action }: {
  action: () => Promise<{ success: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Delete failed.");
        setConfirm(false);
      }
    });
  }

  if (error) return (
    <span style={{ fontSize: "0.72rem", color: "#b91c1c" }}>
      {error}{" "}
      <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "0.72rem" }}>✕</button>
    </span>
  );

  if (confirm) return (
    <span style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center" }}>
      <span style={{ fontSize: "0.72rem", color: "#b91c1c" }}>Delete?</span>
      <button onClick={handleDelete} disabled={isPending} style={{
        padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#dc2626", color: "#fff",
        border: "none", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
      }}>{isPending ? "…" : "Yes"}</button>
      <button onClick={() => setConfirm(false)} style={{
        padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#f3f4f6",
        border: "1px solid #d1d5db", color: "#374151", fontSize: "0.72rem", cursor: "pointer",
      }}>No</button>
    </span>
  );

  return (
    <button onClick={() => setConfirm(true)} style={{
      padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#fef2f2",
      color: "#b91c1c", border: "1px solid #fecaca", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
    }}>Delete</button>
  );
}
