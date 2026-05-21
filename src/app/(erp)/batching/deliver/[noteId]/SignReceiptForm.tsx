"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { receiveConcreteDelivery } from "@/actions/batching";

const ACCENT = "#1a56db";

interface Props {
  deliveryNoteId: string;
  unitId: string;
  volumeDispatchedM3: number;
  userId: string;
}

export function SignReceiptForm({ deliveryNoteId, unitId, volumeDispatchedM3, userId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [volumeReceived, setVolumeReceived] = useState(String(volumeDispatchedM3));
  const [internalRate, setInternalRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ receiptId: string; isFlagged: boolean; varianceM3: number; idbTotal: number } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const vol = parseFloat(volumeReceived);
    const rate = parseFloat(internalRate);
    if (isNaN(vol) || vol <= 0) { setError("Enter a valid received volume."); return; }
    if (isNaN(rate) || rate <= 0) { setError("Enter the internal rate per m³."); return; }

    startTransition(async () => {
      const res = await receiveConcreteDelivery({
        deliveryNoteId,
        unitId,
        volumeReceivedM3: vol,
        internalRatePerM3: rate,
        receivedBy: userId,
      });
      if (res.success) {
        setResult({ receiptId: res.receiptId, isFlagged: res.isFlagged, varianceM3: res.varianceM3, idbTotal: res.idbTotal });
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (result) {
    const PHP = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
    return (
      <div>
        <div style={{
          padding: "1rem", background: result.isFlagged ? "#fef2f2" : "#ecfdf5",
          borderRadius: "8px", marginBottom: "1rem",
        }}>
          <p style={{ margin: 0, fontWeight: 700, color: result.isFlagged ? "#dc2626" : "#065f46", fontSize: "0.9rem" }}>
            {result.isFlagged ? "⚠ Receipt Signed — Variance Flagged" : "✓ Receipt Signed Successfully"}
          </p>
          {result.isFlagged && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#dc2626" }}>
              Variance of {result.varianceM3.toFixed(2)} m³ detected (dispatched vs. received).
            </p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {[
            ["Volume Variance", `${result.varianceM3.toFixed(2)} m³`],
            ["IDB Total Billed", PHP.format(result.idbTotal)],
          ].map(([label, value]) => (
            <div key={label} style={{
              padding: "0.75rem 1rem", background: "#f9fafb", borderRadius: "7px",
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: 600, marginBottom: "0.2rem" }}>{label}</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{
          padding: "0.75rem 1rem", background: "#f3e8ff", borderRadius: "7px",
          borderLeft: "3px solid #7c3aed", fontSize: "0.78rem", color: "#6b21a8",
          marginBottom: "1rem",
        }}>
          <strong>IDB Posted:</strong> Project Cost Center debited · Batching Plant Internal Revenue credited.
          Raw material inventory has been drawn down proportionally.
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="/batching/internal-sales" style={{
            padding: "0.45rem 0.9rem", background: ACCENT, color: "#fff",
            borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
          }}>
            View Internal Sales →
          </a>
          <a href="/batching/deliver" style={{
            padding: "0.45rem 0.9rem", background: "#fff", color: "#374151",
            border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.8rem",
            fontWeight: 600, textDecoration: "none",
          }}>
            Back to Pending Deliveries
          </a>
        </div>
      </div>
    );
  }

  const vol = parseFloat(volumeReceived) || 0;
  const rate = parseFloat(internalRate) || 0;
  const estimatedIDB = vol * rate;
  const PHP = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>
        Confirm Receipt
      </h3>

      <div>
        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>
          Volume Actually Received (m³) <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          type="number"
          value={volumeReceived}
          onChange={(e) => setVolumeReceived(e.target.value)}
          min={0.01}
          step={0.01}
          style={{
            width: "100%", padding: "0.55rem 0.75rem",
            border: "1px solid #d1d5db", borderRadius: "6px",
            fontSize: "0.9rem", color: "#111827", boxSizing: "border-box",
          }}
        />
        {vol !== volumeDispatchedM3 && vol > 0 && (
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: vol < volumeDispatchedM3 ? "#d97706" : "#dc2626" }}>
            Variance: {(volumeDispatchedM3 - vol).toFixed(2)} m³ {vol < volumeDispatchedM3 ? "(short delivery)" : "(over-received — review required)"}
          </p>
        )}
      </div>

      <div>
        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>
          Internal Rate (₱ / m³) <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          type="number"
          value={internalRate}
          onChange={(e) => setInternalRate(e.target.value)}
          min={0.01}
          step={0.01}
          placeholder="e.g. 4500.00"
          style={{
            width: "100%", padding: "0.55rem 0.75rem",
            border: "1px solid #d1d5db", borderRadius: "6px",
            fontSize: "0.9rem", color: "#111827", boxSizing: "border-box",
          }}
        />
      </div>

      {estimatedIDB > 0 && (
        <div style={{
          padding: "0.65rem 0.85rem", background: "#eff6ff",
          borderRadius: "6px", fontSize: "0.8rem", color: "#1e40af",
        }}>
          Estimated IDB Billing: <strong>{PHP.format(estimatedIDB)}</strong>
        </div>
      )}

      {error && (
        <div style={{ padding: "0.65rem 0.85rem", background: "#fef2f2", borderRadius: "6px", fontSize: "0.8rem", color: "#dc2626" }}>
          {error}
        </div>
      )}

      <div style={{ padding: "0.65rem 0.85rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "0.78rem", color: "#92400e" }}>
        <strong>Note:</strong> Signing this receipt is irreversible. It will automatically post IDB billing to Finance and drawdown raw material inventory at the Batching Plant.
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.65rem 1.25rem", background: ACCENT, color: "#fff",
          border: "none", borderRadius: "7px", fontSize: "0.9rem", fontWeight: 700,
          cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? "Processing…" : "Sign & Confirm Receipt"}
      </button>
    </form>
  );
}
