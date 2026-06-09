"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkApproveProgressEntries } from "@/actions/construction";

export function DpeBulkApprove({ entryIds, userId, count }: { entryIds: string[]; userId: string; count: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleApproveAll() {
    if (!confirm(`Approve all ${count} pending progress entries?`)) return;
    startTransition(async () => {
      await bulkApproveProgressEntries(entryIds, userId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleApproveAll}
      disabled={isPending}
      style={{
        padding: "0.55rem 1.1rem", borderRadius: "6px",
        background: isPending ? "#6ee7b7" : "#057a55", color: "#fff",
        border: "none", fontSize: "0.875rem", fontWeight: 600,
        cursor: isPending ? "not-allowed" : "pointer",
      }}
    >
      {isPending ? "Approving…" : `✓ Approve All Pending (${count})`}
    </button>
  );
}
