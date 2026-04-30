"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closePunchListItem, progressPunchListItem } from "@/actions/audit";

export function PunchActions({ id, status }: { id: string; status: string }) {
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

  if (status === "CLOSED") return null;

  return (
    <div>
      {error && <div style={{ color: "#b91c1c", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</div>}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        {status === "OPEN" && (
          <button
            onClick={() => run(() => progressPunchListItem(id))}
            disabled={isPending}
            style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: isPending ? "#fcd34d" : "#d97706", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
            {isPending ? "…" : "Mark In Progress"}
          </button>
        )}
        <button
          onClick={() => run(() => closePunchListItem(id))}
          disabled={isPending}
          style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: isPending ? "#86efac" : "#16a34a", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
          {isPending ? "Closing…" : "Close Item"}
        </button>
      </div>
    </div>
  );
}
