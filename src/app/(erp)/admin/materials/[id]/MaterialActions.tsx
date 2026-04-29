"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMaterialPrice, deactivateMaterial } from "@/actions/admin";

const ACCENT = "#dc2626";

export function MaterialActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [showPrice, setShowPrice] = useState(false);

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await fn();
      if (res.success) { setSuccess(true); setShowPrice(false); router.refresh(); }
      else setError(res.error ?? "Action failed.");
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error   && <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>}
      {success && <div style={{ padding: "0.75rem 1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#057a55", fontSize: "0.875rem" }}>Changes saved.</div>}

      {!showPrice ? (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowPrice(true)}
            style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: ACCENT, color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
            Update Price
          </button>
          {isActive && (
            <button
              onClick={() => run(() => deactivateMaterial(id))}
              disabled={isPending}
              style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
              Deactivate
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>New Price (PHP)</span>
              <input
                type="number" step="0.01" min="0"
                value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0.00"
                style={{ padding: "0.6rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>Effective From</span>
              <input
                type="date"
                value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)}
                style={{ padding: "0.6rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem" }}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => {
                if (!newPrice) { setError("Enter the new price."); return; }
                run(() => updateMaterialPrice(id, newPrice, effectiveFrom));
              }}
              disabled={isPending}
              style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: isPending ? "#fca5a5" : ACCENT, color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
              {isPending ? "Saving…" : "Confirm Price Update"}
            </button>
            <button onClick={() => setShowPrice(false)} style={{ padding: "0.6rem 1rem", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", fontSize: "0.875rem", cursor: "pointer", color: "#374151" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
