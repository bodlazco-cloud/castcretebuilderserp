"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  submitMixDesignForApproval,
  approveMixDesign,
  rejectMixDesign,
  cloneMixDesignAsDraft,
} from "@/actions/batching-bom";

const ACCENT = "#1a56db";

interface Props {
  mixId: string;
  mixCode: string;
  status: string;
  userId: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.45rem 0.6rem", border: "1px solid #d1d5db",
  borderRadius: "6px", fontSize: "0.82rem", boxSizing: "border-box",
};

export function ApprovalBar({ mixId, mixCode, status, userId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showCloneForm, setShowCloneForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cloneCode, setCloneCode] = useState(`${mixCode}-V2`);
  const [cloneName, setCloneName] = useState("");

  function act(fn: () => Promise<{ success: boolean; error?: string } | { success: true; id?: string }>) {
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.success && "error" in res) {
        setError(res.error ?? "An error occurred.");
      } else {
        if ("id" in res && res.id) {
          router.push(`/batching/recipes/${res.id}`);
        } else {
          router.refresh();
        }
      }
    });
  }

  // Nothing to show for APPROVED (just Clone) already shown below
  if (status === "DRAFT" || status === "REJECTED") {
    return (
      <div style={{
        background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        padding: "1rem 1.5rem", marginBottom: "1.25rem",
        display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: "0.8rem", color: "#6b7280", flex: 1 }}>
          {status === "REJECTED"
            ? "Address the rejection feedback in the recipe, then resubmit."
            : "Recipe is in draft. Submit for QC/Admin approval to lock and activate."}
        </span>
        <button
          disabled={isPending}
          onClick={() => act(() => submitMixDesignForApproval(mixId, userId))}
          style={{
            padding: "0.45rem 1rem", background: ACCENT, color: "#fff",
            border: "none", borderRadius: "6px", fontSize: "0.8rem",
            fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Submitting…" : "Submit for Approval"}
        </button>
        {error && <span style={{ fontSize: "0.75rem", color: "#dc2626", width: "100%" }}>{error}</span>}
      </div>
    );
  }

  if (status === "PENDING_REVIEW") {
    return (
      <div style={{
        background: "#fffbeb", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        padding: "1rem 1.5rem", marginBottom: "1.25rem", borderLeft: "4px solid #f59e0b",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "#92400e", flex: 1 }}>
            Awaiting QC / Admin approval. Recipe BOM is locked until a decision is made.
          </span>
          <button
            disabled={isPending}
            onClick={() => act(() => approveMixDesign(mixId, userId))}
            style={{
              padding: "0.45rem 0.9rem", background: "#065f46", color: "#fff",
              border: "none", borderRadius: "6px", fontSize: "0.8rem",
              fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1,
            }}
          >
            Approve & Lock
          </button>
          <button
            disabled={isPending}
            onClick={() => setShowRejectForm((v) => !v)}
            style={{
              padding: "0.45rem 0.9rem", background: "transparent", color: "#dc2626",
              border: "1px solid #fca5a5", borderRadius: "6px", fontSize: "0.8rem",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Reject
          </button>
        </div>

        {showRejectForm && (
          <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="State the reason for rejection…"
              style={{ ...inputStyle, flex: 1, minWidth: "200px" }}
            />
            <button
              disabled={isPending || !rejectReason.trim()}
              onClick={() => act(() => rejectMixDesign(mixId, rejectReason))}
              style={{
                padding: "0.45rem 0.9rem", background: "#dc2626", color: "#fff",
                border: "none", borderRadius: "6px", fontSize: "0.8rem",
                fontWeight: 600, cursor: isPending || !rejectReason.trim() ? "not-allowed" : "pointer",
                opacity: isPending || !rejectReason.trim() ? 0.6 : 1,
              }}
            >
              {isPending ? "Rejecting…" : "Confirm Reject"}
            </button>
          </div>
        )}

        {error && <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#dc2626" }}>{error}</div>}
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div style={{
        background: "#f0fdf4", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        padding: "1rem 1.5rem", marginBottom: "1.25rem", borderLeft: "4px solid #057a55",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "#065f46", flex: 1 }}>
            This mix design is approved and locked. To propose changes, clone it as a new draft version.
          </span>
          <button
            onClick={() => setShowCloneForm((v) => !v)}
            style={{
              padding: "0.45rem 0.9rem", background: ACCENT, color: "#fff",
              border: "none", borderRadius: "6px", fontSize: "0.8rem",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Clone as New Version
          </button>
        </div>

        {showCloneForm && (
          <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "0 0 180px" }}>
              <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: "0.2rem" }}>New Code</div>
              <input value={cloneCode} onChange={(e) => setCloneCode(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: "180px" }}>
              <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: "0.2rem" }}>New Description</div>
              <input
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="e.g. 3000 PSI Standard (Revised)"
                style={inputStyle}
              />
            </div>
            <button
              disabled={isPending || !cloneCode.trim() || !cloneName.trim()}
              onClick={() => act(() => cloneMixDesignAsDraft({
                sourceMixDesignId: mixId,
                newCode:  cloneCode.trim(),
                newName:  cloneName.trim(),
                createdBy: userId,
              }))}
              style={{
                padding: "0.45rem 0.9rem", background: ACCENT, color: "#fff",
                border: "none", borderRadius: "6px", fontSize: "0.8rem",
                fontWeight: 600,
                cursor: isPending || !cloneCode.trim() || !cloneName.trim() ? "not-allowed" : "pointer",
                opacity: isPending || !cloneCode.trim() || !cloneName.trim() ? 0.6 : 1,
              }}
            >
              {isPending ? "Cloning…" : "Create Draft"}
            </button>
          </div>
        )}

        {error && <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#dc2626" }}>{error}</div>}
      </div>
    );
  }

  return null;
}
