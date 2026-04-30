"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewChangeOrder } from "@/actions/planning";

export function CoReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await reviewChangeOrder(id, "APPROVE");
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to approve.");
      }
    });
  }

  function handleReject() {
    if (!rejectionReason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await reviewChangeOrder(id, "REJECT", rejectionReason);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to reject.");
      }
    });
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {error && (
        <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {!showReject ? (
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleApprove}
            disabled={isPending}
            style={{
              padding: "0.65rem 1.4rem", borderRadius: "6px",
              background: isPending ? "#86efac" : "#16a34a",
              color: "#fff", border: "none", fontSize: "0.875rem",
              fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
            }}>
            {isPending ? "Processing…" : "Approve"}
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={isPending}
            style={{
              padding: "0.65rem 1.4rem", borderRadius: "6px",
              background: "#fef2f2", color: "#b91c1c",
              border: "1px solid #fecaca", fontSize: "0.875rem",
              fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
            }}>
            Reject
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
            Rejection Reason <span style={{ color: "#e02424" }}>*</span>
          </label>
          <textarea
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this change order is being rejected…"
            style={{
              display: "block", width: "100%", padding: "0.6rem 0.8rem",
              border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem",
              boxSizing: "border-box", resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={handleReject}
              disabled={isPending}
              style={{
                padding: "0.65rem 1.4rem", borderRadius: "6px",
                background: isPending ? "#fca5a5" : "#dc2626",
                color: "#fff", border: "none", fontSize: "0.875rem",
                fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
              }}>
              {isPending ? "Rejecting…" : "Confirm Rejection"}
            </button>
            <button
              onClick={() => { setShowReject(false); setError(null); }}
              disabled={isPending}
              style={{
                padding: "0.65rem 1.25rem", borderRadius: "6px",
                background: "#f9fafb", border: "1px solid #d1d5db",
                color: "#374151", fontSize: "0.875rem", cursor: "pointer",
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
