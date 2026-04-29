"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestPriceChange } from "@/actions/procurement";

type PO = { id: string; prId: string; totalAmount: string; status: string };
type POItem = { id: string; poId: string; materialName: string; unitPrice: string; quantity: string };

const ACCENT = "#0369a1";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function PriceChangeForm({ pos, poItems, userId }: {
  pos: PO[];
  poItems: POItem[];
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedPo, setSelectedPo] = useState("");
  const [selectedItem, setSelectedItem] = useState("");

  const filteredItems = poItems.filter((i) => i.poId === selectedPo);
  const currentItem = poItems.find((i) => i.id === selectedItem);
  const currentPrice = currentItem ? Number(currentItem.unitPrice) : 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const requestedPrice = Number(fd.get("requestedPrice"));
    startTransition(async () => {
      const result = await requestPriceChange({
        poId:           selectedPo,
        poItemId:       selectedItem || undefined,
        originalPrice:  currentPrice || Number(fd.get("originalPrice")),
        requestedPrice,
        reason:         fd.get("reason") as string,
        requestedBy:    userId,
      });
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0" }}>
        <div style={{
          display: "inline-block", padding: "1.5rem 2rem",
          background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe",
          marginBottom: "1.5rem",
        }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Price Change Request Submitted
          </div>
          <div style={{ color: "#1e40af", fontSize: "0.9rem" }}>
            Pending approval from management.
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button onClick={() => setSuccess(false)} style={{
            padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
            background: "#fff", color: "#374151", fontSize: "0.9rem", cursor: "pointer",
          }}>New Request</button>
          <a href="/procurement" style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: ACCENT, color: "#fff", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none",
          }}>Back to Procurement</a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{
          padding: "0.85rem 1rem", background: "#fef2f2",
          border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem",
        }}>{error}</div>
      )}

      <div style={{
        padding: "0.75rem 1rem", background: "#fffbeb", border: "1px solid #fde68a",
        borderRadius: "6px", fontSize: "0.85rem", color: "#92400e",
      }}>
        Price is normally admin-fixed. This one-time change requires management approval before taking effect.
      </div>

      <label>
        <span style={labelStyle}>Purchase Order *</span>
        <select name="poId" required style={inputStyle}
          value={selectedPo} onChange={(e) => { setSelectedPo(e.target.value); setSelectedItem(""); }}>
          <option value="">Select PO…</option>
          {pos.map((po) => (
            <option key={po.id} value={po.id}>
              PO {po.id.slice(0, 8)}… — PHP {Number(po.totalAmount).toLocaleString()} ({po.status})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span style={labelStyle}>Specific Line Item (optional — leave blank to request for whole PO)</span>
        <select name="poItemId" style={inputStyle}
          value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}
          disabled={!selectedPo}>
          <option value="">All items / whole PO</option>
          {filteredItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.materialName} — PHP {Number(item.unitPrice).toFixed(2)} × {Number(item.quantity).toFixed(2)}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Original / Admin Price (PHP) *</span>
          <input name="originalPrice" type="number" min="0" step="0.01" required style={inputStyle}
            value={currentPrice || ""} readOnly={!!currentItem}
            onChange={() => {}} placeholder="0.00" />
        </label>
        <label>
          <span style={labelStyle}>Requested New Price (PHP) *</span>
          <input name="requestedPrice" type="number" min="0" step="0.01" required style={inputStyle} placeholder="0.00" />
        </label>
      </div>

      <label>
        <span style={labelStyle}>Reason for Price Change * (min. 10 characters)</span>
        <textarea name="reason" required minLength={10} rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Explain why the supplier price differs from the admin-set price…" />
      </label>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/procurement" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#7dd3fc" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Submitting…" : "Submit Price Change Request"}
        </button>
      </div>
    </form>
  );
}
