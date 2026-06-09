"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitNtpForApproval, approveNtp, rejectNtp } from "@/actions/construction";

const ACCENT = "#057a55";

export function NtpRowActions({
  ntpId, status, userId, canApprove,
}: {
  ntpId: string;
  status: string;
  userId: string;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.success) setError(result.error ?? "Error");
      else router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: "160px" }}>
      {error && <div style={{ fontSize: "0.72rem", color: "#b91c1c" }}>{error}</div>}

      {/* View */}
      <a href={`/construction/ntp/${ntpId}`} style={{ fontSize: "0.78rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>
        View →
      </a>

      {/* DRAFT or REJECTED: Edit + Submit */}
      {(status === "DRAFT" || status === "REJECTED") && (
        <>
          <a href={`/construction/ntp/${ntpId}/edit`} style={{
            fontSize: "0.78rem", color: "#1a56db", textDecoration: "none", fontWeight: 600,
          }}>
            Edit
          </a>
          <button
            disabled={isPending}
            onClick={() => run(() => submitNtpForApproval(ntpId, userId))}
            style={{
              fontSize: "0.78rem", background: "#fef9c3", color: "#713f12", border: "1px solid #fde047",
              borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: isPending ? "not-allowed" : "pointer", fontWeight: 600,
            }}
          >
            {isPending ? "…" : "Submit for BOD Approval"}
          </button>
        </>
      )}

      {/* PENDING_BOD + canApprove: Approve + Reject */}
      {status === "PENDING_BOD" && canApprove && !showReject && (
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button
            disabled={isPending}
            onClick={() => run(() => approveNtp(ntpId, userId))}
            style={{
              fontSize: "0.78rem", background: "#dcfce7", color: "#166534", border: "1px solid #86efac",
              borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: isPending ? "not-allowed" : "pointer", fontWeight: 600,
            }}
          >
            {isPending ? "…" : "Approve"}
          </button>
          <button
            onClick={() => setShowReject(true)}
            style={{
              fontSize: "0.78rem", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca",
              borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer", fontWeight: 600,
            }}
          >
            Reject
          </button>
        </div>
      )}

      {/* Reject dialog inline */}
      {status === "PENDING_BOD" && canApprove && showReject && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <input
            type="text"
            placeholder="Rejection reason…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{ fontSize: "0.78rem", padding: "0.3rem 0.5rem", border: "1px solid #fecaca", borderRadius: "4px", width: "100%" }}
          />
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <button
              disabled={isPending || !rejectReason.trim()}
              onClick={() => run(() => rejectNtp({ ntpId, rejectedBy: userId, reason: rejectReason }))}
              style={{
                fontSize: "0.78rem", background: "#b91c1c", color: "#fff", border: "none",
                borderRadius: "4px", padding: "0.25rem 0.5rem", cursor: isPending ? "not-allowed" : "pointer", fontWeight: 600,
              }}
            >
              {isPending ? "…" : "Confirm Reject"}
            </button>
            <button onClick={() => { setShowReject(false); setRejectReason(""); }} style={{
              fontSize: "0.78rem", background: "#f3f4f6", color: "#374151", border: "none",
              borderRadius: "4px", padding: "0.25rem 0.5rem", cursor: "pointer",
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE: Log Progress */}
      {status === "ACTIVE" && (
        <a href={`/construction/log-progress`} style={{
          fontSize: "0.78rem", color: ACCENT, textDecoration: "none", fontWeight: 600,
        }}>
          + Log Progress
        </a>
      )}
    </div>
  );
}
