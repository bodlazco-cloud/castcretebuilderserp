"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBomForReview, reviewMasterBom } from "@/actions/planning";

// ── Submit DRAFT entries for BOD approval ─────────────────────────────────────

export function BomSubmitActions({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function handleSubmit() {
    setMsg(null);
    startTransition(async () => {
      const result = await submitBomForReview(ids);
      if (result.success) {
        setMsg({ text: `${ids.length} line${ids.length !== 1 ? "s" : ""} submitted for BOD approval.`, ok: true });
        router.refresh();
      } else {
        setMsg({ text: result.error ?? "Failed to submit.", ok: false });
      }
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
      <button
        onClick={handleSubmit}
        disabled={isPending || ids.length === 0}
        style={{
          padding: "0.4rem 0.9rem", borderRadius: "6px",
          background: isPending ? "#93c5fd" : "#2563eb",
          color: "#fff", border: "none", fontSize: "0.78rem",
          fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        }}>
        {isPending ? "Submitting…" : `Submit ${ids.length} line${ids.length !== 1 ? "s" : ""} for BOD Approval`}
      </button>
      {msg && (
        <span style={{ fontSize: "0.78rem", color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</span>
      )}
    </div>
  );
}

// ── BOD Approve / Reject individual lines ─────────────────────────────────────

export function BomReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await reviewMasterBom(id, "APPROVE");
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to approve.");
      }
    });
  }

  function handleReject() {
    if (!reason.trim()) { setError("Rejection reason is required."); return; }
    setError(null);
    startTransition(async () => {
      const result = await reviewMasterBom(id, "REJECT", reason);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to reject.");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
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
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason…"
            style={{
              padding: "0.2rem 0.5rem", border: "1px solid #fca5a5",
              borderRadius: "4px", fontSize: "0.72rem", width: "180px",
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
