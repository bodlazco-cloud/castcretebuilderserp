"use client";

import { useState, useTransition } from "react";
import { releasePaymentRequest } from "@/actions/finance";

export function ReleaseActions({
  paymentRequestId,
  requiresDualAuth,
}: {
  paymentRequestId: string;
  requiresDualAuth: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleRelease() {
    setResult(null);
    startTransition(async () => {
      const res = await releasePaymentRequest(paymentRequestId);
      if (res.success) {
        setResult({ ok: true, message: "Released" });
      } else {
        setResult({ ok: false, message: res.error ?? "Failed." });
      }
    });
  }

  if (result?.ok) {
    return (
      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#057a55" }}>✓ Released</span>
    );
  }

  return (
    <div>
      <button
        onClick={handleRelease}
        disabled={isPending}
        style={{
          padding: "0.4rem 0.85rem", borderRadius: "6px", border: "none",
          background: isPending ? "#d1d5db" : requiresDualAuth ? "#dc2626" : "#16a34a",
          color: "#fff", fontSize: "0.8rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {isPending ? "Processing…" : requiresDualAuth ? "Authorize (Dual-Auth)" : "Authorize Release"}
      </button>
      {result && !result.ok && (
        <p style={{ marginTop: "0.3rem", fontSize: "0.72rem", color: "#b91c1c", maxWidth: "160px" }}>
          {result.message}
        </p>
      )}
    </div>
  );
}
