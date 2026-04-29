"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { firstApproveRfp, finalApproveRfp, rejectRfp } from "@/actions/finance";

export function RfpActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.success) router.refresh();
      else setError(res.error ?? "Action failed.");
    });
  }

  if (status === "APPROVED" || status === "REJECTED") return null;

  return (
    <div>
      {error && <div style={{ color: "#b91c1c", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</div>}

      {!showReject && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {status === "PENDING" && (
            <button
              onClick={() => run(() => firstApproveRfp(id))}
              disabled={isPending}
              style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: isPending ? "#93c5fd" : "#1a56db", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
              {isPending ? "…" : "First Approval"}
            </button>
          )}
          {status === "FIRST_APPROVED" && (
            <button
              onClick={() => run(() => finalApproveRfp(id))}
              disabled={isPending}
              style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: isPending ? "#86efac" : "#16a34a", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
              {isPending ? "…" : "Final Approval — Release Payment"}
            </button>
          )}
          <button
            onClick={() => setShowReject(true)}
            style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
            Reject
          </button>
        </div>
      )}

      {showReject && (
        <div>
          <textarea
            rows={3}
            placeholder="Rejection reason…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", marginBottom: "0.75rem", resize: "vertical", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => {
                if (!reason.trim()) { setError("Enter a rejection reason."); return; }
                run(() => rejectRfp(id, reason));
              }}
              disabled={isPending}
              style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: "#b91c1c", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
              {isPending ? "…" : "Confirm Rejection"}
            </button>
            <button onClick={() => setShowReject(false)} style={{ padding: "0.6rem 1rem", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", fontSize: "0.875rem", cursor: "pointer", color: "#374151" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
