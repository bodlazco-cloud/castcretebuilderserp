"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMrr } from "@/actions/procurement";

const ACCENT = "#1a56db";

interface LineItem {
  materialId: string;
  matCode:    string;
  matName:    string;
  matUnit:    string;
  orderedQty: number;
  unitPrice:  number;
}

interface Props {
  poId:       string;
  projectId:  string;
  supplierId: string;
  items:      LineItem[];
}

export function ReceiveMRRForm({ poId, projectId, supplierId, items }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.materialId, String(i.orderedQty)]))
  );
  const [notes, setNotes] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [done, setDone] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.45rem 0.6rem", border: "1px solid #d1d5db",
    borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box", textAlign: "right",
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const mrrItems = items.map((item) => ({
        materialId:       item.materialId,
        quantityReceived: parseFloat(receivedQtys[item.materialId] ?? "0") || 0,
        unitPrice:        item.unitPrice,
        shadowPrice:      0,
      })).filter((i) => i.quantityReceived > 0);

      if (mrrItems.length === 0) {
        setError("Enter at least one received quantity greater than zero.");
        return;
      }

      const res = await createMrr({
        poId,
        projectId,
        supplierId,
        sourceType:   "SUPPLIER",
        receivedDate,
        notes:        notes || undefined,
        items:        mrrItems,
      });

      if (res.success) {
        setDone(true);
        setTimeout(() => router.push("/batching/mrr"), 1500);
      } else {
        setError(res.error);
      }
    });
  }

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✓</div>
        <div style={{ fontWeight: 700, color: "#057a55", fontSize: "1rem" }}>Materials received and posted to inventory</div>
        <div style={{ color: "#9ca3af", fontSize: "0.82rem", marginTop: "0.25rem" }}>Redirecting…</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Date + notes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>
            Received Date *
          </label>
          <input
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            required
            style={{ ...inputStyle, textAlign: "left" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Delivery condition, partial, etc."
            style={{ ...inputStyle, textAlign: "left" }}
          />
        </div>
      </div>

      {/* Line items */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", gap: 0 }}>
          {["Code", "Material", "Unit", "Ordered", "Qty Received *"].map((h, i) => (
            <div key={i} style={{ padding: "0.55rem 0.75rem", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textAlign: i >= 3 ? "right" : "left" }}>{h}</div>
          ))}
        </div>
        {items.map((item, idx) => (
          <div
            key={item.materialId}
            style={{
              display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr",
              borderBottom: idx < items.length - 1 ? "1px solid #f3f4f6" : undefined,
              alignItems: "center",
            }}
          >
            <div style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 600, color: ACCENT }}>{item.matCode}</div>
            <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.82rem", color: "#374151" }}>{item.matName}</div>
            <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.78rem", color: "#6b7280", textAlign: "right" }}>{item.matUnit}</div>
            <div style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontFamily: "monospace", fontSize: "0.82rem", color: "#9ca3af" }}>
              {item.orderedQty.toFixed(4)}
            </div>
            <div style={{ padding: "0.35rem 0.75rem" }}>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={receivedQtys[item.materialId] ?? ""}
                onChange={(e) => setReceivedQtys((prev) => ({ ...prev, [item.materialId]: e.target.value }))}
                required
                style={inputStyle}
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: "0.65rem 0.85rem", background: "#fef2f2", color: "#dc2626", borderRadius: "6px", fontSize: "0.82rem" }}>
          {error}
        </div>
      )}

      <div style={{ padding: "0.75rem 1rem", background: "#eff6ff", borderRadius: "6px", fontSize: "0.78rem", color: "#1e40af" }}>
        Received quantities will be posted to Batching Plant inventory. The PO will be marked Delivered.
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem" }}>
        <a
          href="/batching/mrr"
          style={{ padding: "0.55rem 1rem", background: "transparent", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.85rem", color: "#374151", textDecoration: "none" }}
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isPending}
          style={{ padding: "0.55rem 1.1rem", background: isPending ? "#93c5fd" : ACCENT, color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}
        >
          {isPending ? "Posting…" : "Confirm Receipt & Post to Inventory"}
        </button>
      </div>
    </form>
  );
}
