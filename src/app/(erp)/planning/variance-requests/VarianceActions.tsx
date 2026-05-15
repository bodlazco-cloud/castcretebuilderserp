"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewVarianceRequest } from "@/actions/planning";

export function VarianceActions({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await reviewVarianceRequest(id, "APPROVE");
      if (result.success) { router.refresh(); } else { setError(result.error ?? "Failed."); }
    });
  }

  function handleReject() {
    if (!reason.trim()) { setError("Reason required."); return; }
    setError(null);
    startTransition(async () => {
      const result = await reviewVarianceRequest(id, "REJECT", reason);
      if (result.success) { router.refresh(); } else { setError(result.error ?? "Failed."); }
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {error && <span className="text-xs text-red-400">{error}</span>}
      {!showReject ? (
        <>
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="px-2 py-1 rounded text-xs font-semibold bg-green-700 hover:bg-green-600 text-white disabled:opacity-50 transition-colors"
          >
            {isPending ? "…" : "Approve"}
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={isPending}
            className="px-2 py-1 rounded text-xs font-semibold border border-red-700 text-red-400 hover:bg-red-900/30 transition-colors"
          >
            Reject
          </button>
        </>
      ) : (
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason…"
            className="px-2 py-1 rounded text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 w-36 focus:outline-none focus:border-red-500"
          />
          <button
            onClick={handleReject}
            disabled={isPending}
            className="px-2 py-1 rounded text-xs font-semibold bg-red-700 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
          >
            {isPending ? "…" : "Confirm"}
          </button>
          <button
            onClick={() => { setShowReject(false); setError(null); }}
            className="px-2 py-1 rounded text-xs border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        </span>
      )}
    </span>
  );
}
