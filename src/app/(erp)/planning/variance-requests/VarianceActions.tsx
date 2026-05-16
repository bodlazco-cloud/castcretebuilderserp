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
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
      {error && <span style={{ fontSize: "0.72rem", color: "#b91c1c" }}>{error}</span>}
      {!showReject ? (
        <>
          <button
            onClick={handleApprove}
            disabled={isPending}
            style={{
              padding: "0.2rem 0.6rem", borderRadius: "4px",
              background: isPending ? "#86efac" : "#16a34a",
              color: "#fff", border: "none", fontSize: "0.72rem",
              fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
            }}>
            {isPending ? "…" : "Approve"}
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={isPending}
            style={{
              padding: "0.2rem 0.6rem", borderRadius: "4px",
              background: "#fef2f2", color: "#b91c1c",
              border: "1px solid #fecaca", fontSize: "0.72rem",
              fontWeight: 600, cursor: "pointer",
            }}>
            Reject
          </button>
        </>
      ) : (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason…"
            style={{
              padding: "0.2rem 0.5rem", border: "1px solid #fca5a5",
              borderRadius: "4px", fontSize: "0.72rem", width: "160px",
            }}
          />
          <button
            onClick={handleReject}
            disabled={isPending}
            style={{
              padding: "0.2rem 0.6rem", borderRadius: "4px",
              background: "#dc2626", color: "#fff",
              border: "none", fontSize: "0.72rem",
              fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
            }}>
            {isPending ? "…" : "Confirm"}
          </button>
          <button
            onClick={() => { setShowReject(false); setError(null); }}
            style={{
              padding: "0.2rem 0.5rem", borderRadius: "4px",
              background: "#f9fafb", border: "1px solid #d1d5db",
              color: "#374151", fontSize: "0.72rem", cursor: "pointer",
            }}>
            Cancel
          </button>
        </span>
      )}
    </span>
  );
}
