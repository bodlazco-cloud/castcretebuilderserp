"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveProgressEntry, rejectProgressEntry } from "@/actions/construction";

const ACCENT = "#057a55";

export function DpeApprovalPanel({
  entryId, approvalStatus, userId, canApprove, approvedAt, rejectionReason,
}: {
  entryId: string;
  approvalStatus: string;
  userId: string;
  canApprove: boolean;
  approvedAt: string | null;
  rejectionReason: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.success) setError(r.error ?? "Error");
      else router.refresh();
    });
  }

  if (approvalStatus === "APPROVED") {
    return (
      <div style={{ marginBottom: "1.5rem", padding: "0.9rem 1.1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span>✅</span>
        <div>
          <div style={{ fontWeight: 700, color: "#166534", fontSize: "0.9rem" }}>Approved by Manager</div>
          {approvedAt && <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>{new Date(approvedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</div>}
        </div>
      </div>
    );
  }

  if (approvalStatus === "REJECTED") {
    return (
      <div style={{ marginBottom: "1.5rem", padding: "1rem 1.1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
        <div style={{ fontWeight: 700, color: "#b91c1c", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Rejected</div>
        {rejectionReason && <div style={{ fontSize: "0.875rem", color: "#374151" }}>{rejectionReason}</div>}
        {canApprove && (
          <button
            disabled={isPending}
            onClick={() => run(() => approveProgressEntry(entryId, userId))}
            style={{ marginTop: "0.75rem", padding: "0.45rem 0.9rem", borderRadius: "6px", background: ACCENT, color: "#fff", border: "none", fontSize: "0.82rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}
          >
            {isPending ? "…" : "Override: Approve"}
          </button>
        )}
      </div>
    );
  }

  // PENDING_REVIEW
  return (
    <div style={{ marginBottom: "1.5rem", padding: "1.25rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb" }}>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>
        Manager Approval
      </p>
      {error && (
        <div style={{ marginBottom: "0.75rem", padding: "0.6rem 0.85rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {!canApprove && (
        <div style={{ padding: "0.6rem 1rem", background: "#fef9c3", borderRadius: "6px", fontSize: "0.875rem", color: "#713f12", fontWeight: 500 }}>
          ⏳ Pending manager approval
        </div>
      )}

      {canApprove && !showReject && (
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            disabled={isPending}
            onClick={() => run(() => approveProgressEntry(entryId, userId))}
            style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT, color: "#fff",
              border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Approving…" : "✓ Approve Entry"}
          </button>
          <button
            onClick={() => setShowReject(true)}
            style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#fff", color: "#b91c1c",
              border: "1px solid #fecaca", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            Reject
          </button>
        </div>
      )}

      {canApprove && showReject && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <textarea
            rows={2}
            placeholder="Rejection reason (required)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ padding: "0.6rem 0.8rem", fontSize: "0.875rem", border: "1px solid #fecaca", borderRadius: "6px", resize: "vertical", width: "100%", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              disabled={isPending || !reason.trim()}
              onClick={() => run(() => rejectProgressEntry({ entryId, rejectedBy: userId, reason }))}
              style={{
                padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#b91c1c", color: "#fff",
                border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending || !reason.trim() ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "Rejecting…" : "Confirm Rejection"}
            </button>
            <button onClick={() => { setShowReject(false); setReason(""); }} style={{
              padding: "0.55rem 1rem", borderRadius: "6px", background: "#f3f4f6", color: "#374151",
              border: "1px solid #e5e7eb", fontSize: "0.875rem", cursor: "pointer",
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
