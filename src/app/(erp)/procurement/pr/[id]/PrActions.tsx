"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approvePr, rejectPr, submitPr } from "@/actions/procurement";

export function PrActions({ prId, status }: { prId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.success) router.refresh();
      else setError(result.error ?? "Action failed.");
    });
  }

  if (status === "DRAFT") {
    return (
      <div>
        {error && <div style={{ color: "#b91c1c", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</div>}
        <button
          onClick={() => run(() => submitPr(prId))}
          disabled={isPending}
          style={{ padding: "0.6rem 1.4rem", borderRadius: "6px", background: isPending ? "#fcd34d" : "#d97706", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
          {isPending ? "Submitting…" : "Submit for Review"}
        </button>
      </div>
    );
  }

  if (status === "PENDING_REVIEW") {
    return (
      <div>
        {error && <div style={{ color: "#b91c1c", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</div>}
        {!showReject ? (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => run(() => approvePr(prId))}
              disabled={isPending}
              style={{ padding: "0.6rem 1.4rem", borderRadius: "6px", background: isPending ? "#86efac" : "#16a34a", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
              {isPending ? "Approving…" : "Approve PR"}
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={isPending}
              style={{ padding: "0.6rem 1.4rem", borderRadius: "6px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
              Reject
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Rejection reason (required)…"
              style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => { if (!reason.trim()) { setError("Reason required."); return; } run(() => rejectPr(prId, reason)); }}
                disabled={isPending}
                style={{ padding: "0.6rem 1.4rem", borderRadius: "6px", background: isPending ? "#fca5a5" : "#dc2626", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
                {isPending ? "Rejecting…" : "Confirm Rejection"}
              </button>
              <button onClick={() => { setShowReject(false); setError(null); }} disabled={isPending}
                style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: "#f9fafb", border: "1px solid #d1d5db", color: "#374151", fontSize: "0.875rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
