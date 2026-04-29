"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitInvoice, recordCollection } from "@/actions/finance";

const ACCENT = "#ff5a1f";

export function InvoiceActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCollect, setShowCollect] = useState(false);
  const [collectAmount, setCollectAmount] = useState("");

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.success) router.refresh();
      else setError(res.error ?? "Action failed.");
    });
  }

  if (status === "COLLECTED" || status === "REJECTED") return null;

  return (
    <div>
      {error && (
        <div style={{ color: "#b91c1c", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</div>
      )}

      {status === "DRAFT" && (
        <button
          onClick={() => run(() => submitInvoice(id))}
          disabled={isPending}
          style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: isPending ? "#93c5fd" : "#1a56db", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
          {isPending ? "…" : "Submit Invoice"}
        </button>
      )}

      {status === "SUBMITTED" && !showCollect && (
        <button
          onClick={() => setShowCollect(true)}
          style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: "#057a55", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
          Record Collection
        </button>
      )}

      {status === "SUBMITTED" && showCollect && (
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount collected (PHP)"
            value={collectAmount}
            onChange={(e) => setCollectAmount(e.target.value)}
            style={{ padding: "0.55rem 0.75rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.875rem", width: "220px" }}
          />
          <button
            onClick={() => {
              if (!collectAmount) { setError("Enter the collected amount."); return; }
              run(() => recordCollection(id, collectAmount));
            }}
            disabled={isPending}
            style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: isPending ? "#86efac" : "#057a55", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
            {isPending ? "Saving…" : "Confirm Collection"}
          </button>
          <button onClick={() => setShowCollect(false)} style={{ padding: "0.6rem 1rem", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", fontSize: "0.875rem", cursor: "pointer", color: "#374151" }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
