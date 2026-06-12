"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateForecastQuantity, deleteForecast } from "@/actions/planning";

export function ForecastAdminActions({
  forecastId, grossQuantity,
}: {
  forecastId: string;
  grossQuantity: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [qty, setQty] = useState(String(grossQuantity));
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateForecastQuantity(forecastId, Number(qty));
      if (result.success) { setEditing(false); router.refresh(); }
      else setError(result.error ?? "Failed to update.");
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteForecast(forecastId);
      if (result.success) router.refresh();
      else { setError(result.error ?? "Failed to delete."); setConfirming(false); }
    });
  }

  if (editing) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
        {error && <span style={{ fontSize: "0.7rem", color: "#b91c1c" }}>{error}</span>}
        <input type="number" min="0.0001" step="0.0001" value={qty}
          onChange={(e) => setQty(e.target.value)}
          style={{ width: "100px", padding: "0.2rem 0.4rem", fontSize: "0.78rem", border: "1px solid #d1d5db", borderRadius: "4px" }} />
        <button disabled={isPending} onClick={handleSave}
          style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: isPending ? "#93c5fd" : "#1a56db", color: "#fff", border: "none", cursor: isPending ? "not-allowed" : "pointer", fontWeight: 600 }}>
          {isPending ? "…" : "Save"}
        </button>
        <button onClick={() => { setEditing(false); setError(null); setQty(String(grossQuantity)); }}
          style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#f9fafb", border: "1px solid #d1d5db", color: "#374151", cursor: "pointer" }}>
          Cancel
        </button>
      </span>
    );
  }

  if (confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
        {error && <span style={{ fontSize: "0.7rem", color: "#b91c1c" }}>{error}</span>}
        <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>Delete this line?</span>
        <button disabled={isPending} onClick={handleDelete}
          style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: isPending ? "#fca5a5" : "#dc2626", color: "#fff", border: "none", cursor: isPending ? "not-allowed" : "pointer", fontWeight: 600 }}>
          {isPending ? "…" : "Confirm"}
        </button>
        <button onClick={() => { setConfirming(false); setError(null); }}
          style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#f9fafb", border: "1px solid #d1d5db", color: "#374151", cursor: "pointer" }}>
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
      {error && <span style={{ fontSize: "0.7rem", color: "#b91c1c" }}>{error}</span>}
      <button onClick={() => setEditing(true)}
        style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#eff6ff", color: "#1a56db", border: "1px solid #bfdbfe", cursor: "pointer", fontWeight: 600 }}>
        Edit
      </button>
      <button onClick={() => setConfirming(true)}
        style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", cursor: "pointer", fontWeight: 600 }}>
        Delete
      </button>
    </span>
  );
}
