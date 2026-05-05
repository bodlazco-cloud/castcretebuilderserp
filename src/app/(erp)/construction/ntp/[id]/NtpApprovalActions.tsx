"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveNtp, rejectNtp } from "@/actions/construction";

const ACCENT = "#057a55";

export function NtpApprovalActions({ ntpId }: { ntpId: string }) {
  const router = useRouter();
  const [isApproving, startApprove] = useTransition();
  const [isRejecting, startReject] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);

  function handleApprove() {
    setError(null);
    startApprove(async () => {
      const res = await approveNtp(ntpId);
      if (res.success) {
        setResult(`NTP activated. ${res.prsCreated} Purchase Requisition${res.prsCreated !== 1 ? "s" : ""} auto-generated.`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleReject() {
    setError(null);
    startReject(async () => {
      const res = await rejectNtp(ntpId);
      if (res.success) {
        setConfirmReject(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: "8px", padding: "1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ fontWeight: 700, color: "#713f12", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
        Planning Review Required
      </div>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#713f12", lineHeight: 1.5 }}>
        This NTP is awaiting Planning &amp; Engineering review. Verify the resource forecasting (materials, manpower, equipment), then approve to activate the NTP and auto-generate Purchase Requisitions.
      </p>

      {error && (
        <div style={{ padding: "0.5rem 0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
          {error}
        </div>
      )}
      {result && (
        <div style={{ padding: "0.5rem 0.75rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", color: "#166534", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
          {result}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
          style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: isApproving ? "#86efac" : ACCENT, color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isApproving ? "not-allowed" : "pointer" }}
        >
          {isApproving ? "Approving…" : "✓ Approve NTP"}
        </button>

        {!confirmReject ? (
          <button
            onClick={() => setConfirmReject(true)}
            disabled={isApproving || isRejecting}
            style={{ padding: "0.55rem 1rem", borderRadius: "6px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
          >
            Return to Operations
          </button>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "#b91c1c" }}>Return NTP to Draft?</span>
            <button
              onClick={handleReject}
              disabled={isRejecting}
              style={{ padding: "0.4rem 0.85rem", borderRadius: "6px", background: "#dc2626", color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
            >
              {isRejecting ? "Returning…" : "Yes, Return"}
            </button>
            <button
              onClick={() => setConfirmReject(false)}
              style={{ padding: "0.4rem 0.85rem", borderRadius: "6px", background: "#f3f4f6", color: "#374151", border: "none", fontSize: "0.8rem", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        )}

        <a
          href="/planning/resource-forecasting"
          style={{ padding: "0.5rem 0.85rem", borderRadius: "6px", background: "#eff6ff", color: "#1e40af", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}
        >
          View Resource Forecast →
        </a>
      </div>
    </div>
  );
}
