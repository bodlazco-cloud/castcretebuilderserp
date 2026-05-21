"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dispatchConcreteDelivery } from "@/actions/batching";

const ACCENT = "#1a56db";

interface Unit {
  id: string;
  unitCode: string;
  projectId: string;
}

interface Props {
  productionLogId: string;
  projectId: string;
  maxVolumeM3: number;
  userId: string;
  units: Unit[];
}

export function DispatchForm({ productionLogId, projectId, maxVolumeM3, userId, units }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [unitId, setUnitId] = useState("");
  const [volume, setVolume] = useState(String(maxVolumeM3));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const vol = parseFloat(volume);
    if (!unitId) { setError("Please select a target unit."); return; }
    if (isNaN(vol) || vol <= 0) { setError("Enter a valid volume."); return; }
    if (vol > maxVolumeM3) { setError(`Cannot exceed produced volume of ${maxVolumeM3.toFixed(2)} m³.`); return; }

    startTransition(async () => {
      const res = await dispatchConcreteDelivery({
        productionLogId,
        projectId,
        unitId,
        volumeDispatchedM3: vol,
        dispatchedBy: userId,
      });
      if (res.success) {
        setDone(true);
        setNoteId(res.noteId);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (done && noteId) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
        padding: "0.75rem 1rem", background: "#ecfdf5", borderRadius: "7px",
      }}>
        <span style={{ fontSize: "0.85rem", color: "#065f46", fontWeight: 600 }}>
          ✓ Delivery Note created — awaiting site sign-off
        </span>
        <a href="/batching/deliver" style={{
          padding: "0.3rem 0.7rem", background: ACCENT, color: "#fff",
          borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none",
        }}>
          View Pending Deliveries →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
      <div>
        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.3rem" }}>
          Target Unit
        </label>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          style={{
            padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px",
            fontSize: "0.83rem", color: "#111827", background: "#fff", minWidth: "160px",
          }}
        >
          <option value="">Select unit…</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.unitCode}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.3rem" }}>
          Volume to Dispatch (m³)
        </label>
        <input
          type="number"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          min={0.01}
          max={maxVolumeM3}
          step={0.01}
          style={{
            padding: "0.45rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px",
            fontSize: "0.83rem", color: "#111827", width: "120px",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {error && <span style={{ fontSize: "0.72rem", color: "#dc2626" }}>{error}</span>}
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "0.48rem 1rem", background: ACCENT, color: "#fff",
            border: "none", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Creating…" : "Dispatch →"}
        </button>
      </div>
    </form>
  );
}
