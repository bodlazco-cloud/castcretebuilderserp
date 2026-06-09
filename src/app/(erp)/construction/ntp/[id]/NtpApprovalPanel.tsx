"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitNtpForApproval, reviewNtp, approveNtp, rejectNtp } from "@/actions/construction";

const ACCENT = "#057a55";

export function NtpApprovalPanel({
  ntpId, status, userId, canReview, canApprove, rejectionReason, submittedAt, reviewedAt, bodApprovedAt,
}: {
  ntpId: string;
  status: string;
  userId: string;
  canReview: boolean;
  canApprove: boolean;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  bodApprovedAt: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.success) setError(r.error ?? "Error");
      else router.refresh();
    });
  }

  if (status === "ACTIVE") {
    return (
      <div style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.1rem" }}>✅</span>
        <div>
          <div style={{ fontWeight: 700, color: "#166534", fontSize: "0.9rem" }}>BOD Approved — NTP is Active</div>
          {bodApprovedAt && <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>Approved {new Date(bodApprovedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</div>}
        </div>
      </div>
    );
  }

  if (status === "COMPLETED") return null;

  const steps = [
    {
      label: "Draft",
      sublabel: "NTP created",
      done: true,
      active: status === "DRAFT",
      rejected: false,
    },
    {
      label: "Submitted for Review",
      sublabel: submittedAt ? `Submitted ${new Date(submittedAt).toLocaleDateString("en-PH")}` : "Awaiting submission",
      done: !["DRAFT", "REJECTED"].includes(status),
      active: status === "PENDING_REVIEW",
      rejected: false,
    },
    {
      label: "Manager Reviewed",
      sublabel: reviewedAt ? `Reviewed ${new Date(reviewedAt).toLocaleDateString("en-PH")}` : status === "REJECTED" ? `Rejected: ${rejectionReason ?? ""}` : "Awaiting review",
      done: ["PENDING_BOD", "ACTIVE", "COMPLETED"].includes(status),
      active: status === "PENDING_BOD",
      rejected: status === "REJECTED",
    },
    {
      label: "BOD Approved → Active",
      sublabel: bodApprovedAt ? `Approved ${new Date(bodApprovedAt).toLocaleDateString("en-PH")}` : "Awaiting BOD approval",
      done: ["ACTIVE", "COMPLETED"].includes(status),
      active: false,
      rejected: false,
    },
  ];

  return (
    <div style={{ marginBottom: "1.5rem", padding: "1.25rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb" }}>
      <p style={{ margin: "0 0 1rem", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af" }}>
        Approval Workflow
      </p>

      {error && (
        <div style={{ marginBottom: "0.75rem", padding: "0.65rem 0.9rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* 4-step timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <div style={{
              width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
              background: s.rejected ? "#fef2f2" : s.done ? "#dcfce7" : s.active ? "#fef9c3" : "#f3f4f6",
              border: `2px solid ${s.rejected ? "#fecaca" : s.done ? "#86efac" : s.active ? "#fde047" : "#e5e7eb"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 700,
              color: s.rejected ? "#b91c1c" : s.done ? "#166534" : s.active ? "#713f12" : "#9ca3af",
            }}>
              {s.rejected ? "✕" : s.done ? "✓" : i + 1}
            </div>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: s.rejected ? "#b91c1c" : s.done ? "#166534" : s.active ? "#713f12" : "#6b7280" }}>{s.label}</div>
              <div style={{ fontSize: "0.72rem", color: s.rejected ? "#b91c1c" : "#9ca3af" }}>{s.sublabel}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-start" }}>

        {/* Issuer submits for review */}
        {(status === "DRAFT" || status === "REJECTED") && (
          <button disabled={isPending || !userId}
            onClick={() => run(() => submitNtpForApproval(ntpId, userId))}
            style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#fef9c3", color: "#713f12", border: "1px solid #fde047", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}>
            {isPending ? "Submitting…" : "Submit for Review"}
          </button>
        )}

        {/* Manager: review → forward to BOD */}
        {status === "PENDING_REVIEW" && canReview && !showReject && (
          <>
            <button disabled={isPending}
              onClick={() => run(() => reviewNtp(ntpId, userId))}
              style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#1d4ed8", color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}>
              {isPending ? "Reviewing…" : "✓ Review & Forward to BOD"}
            </button>
            <button onClick={() => setShowReject(true)}
              style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}>
              Reject
            </button>
          </>
        )}

        {status === "PENDING_REVIEW" && !canReview && (
          <div style={{ padding: "0.6rem 1rem", background: "#eff6ff", borderRadius: "6px", fontSize: "0.875rem", color: "#1e40af", fontWeight: 500 }}>
            ⏳ Awaiting manager review
          </div>
        )}

        {/* BOD: final approval */}
        {status === "PENDING_BOD" && canApprove && !showReject && (
          <>
            <button disabled={isPending}
              onClick={() => run(() => approveNtp(ntpId, userId))}
              style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT, color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}>
              {isPending ? "Approving…" : "✓ BOD Approve"}
            </button>
            <button onClick={() => setShowReject(true)}
              style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}>
              Reject
            </button>
          </>
        )}

        {status === "PENDING_BOD" && !canApprove && (
          <div style={{ padding: "0.6rem 1rem", background: "#fef9c3", borderRadius: "6px", fontSize: "0.875rem", color: "#713f12", fontWeight: 500 }}>
            ⏳ Awaiting BOD approval
          </div>
        )}

        {/* Reject form (shared for both pending stages) */}
        {showReject && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
            <textarea rows={2} placeholder="Rejection reason (required)…"
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              style={{ padding: "0.6rem 0.8rem", fontSize: "0.875rem", border: "1px solid #fecaca", borderRadius: "6px", resize: "vertical", width: "100%", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button disabled={isPending || !rejectReason.trim()}
                onClick={() => run(() => rejectNtp({ ntpId, rejectedBy: userId, reason: rejectReason }))}
                style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#b91c1c", color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending || !rejectReason.trim() ? "not-allowed" : "pointer" }}>
                {isPending ? "Rejecting…" : "Confirm Rejection"}
              </button>
              <button onClick={() => { setShowReject(false); setRejectReason(""); }}
                style={{ padding: "0.55rem 1rem", borderRadius: "6px", background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", fontSize: "0.875rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
