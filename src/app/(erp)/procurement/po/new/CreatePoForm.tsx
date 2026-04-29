"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPoFromApprovedPr } from "@/actions/procurement";

type Supplier = { id: string; name: string };
type PrSummary = { id: string; projName: string; activityName: string | null; totalAmount: string; itemCount: number };

const ACCENT = "#e3a008";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function CreatePoForm({
  pr, suppliers, userId,
}: {
  pr:        PrSummary;
  suppliers: Supplier[];
  userId:    string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPrepaid, setIsPrepaid] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createPoFromApprovedPr({
        prId:       pr.id,
        supplierId: fd.get("supplierId") as string,
        createdBy:  userId,
        isPrepaid,
      });
      if (result.success) {
        router.push(`/procurement/po/${result.poId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* PR summary card */}
      <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Source PR</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", fontSize: "0.875rem" }}>
          <div><span style={{ color: "#6b7280" }}>Project: </span><strong>{pr.projName}</strong></div>
          <div><span style={{ color: "#6b7280" }}>Activity: </span><strong>{pr.activityName ?? "—"}</strong></div>
          <div><span style={{ color: "#6b7280" }}>Lines: </span><strong>{pr.itemCount}</strong></div>
          <div style={{ gridColumn: "span 3" }}>
            <span style={{ color: "#6b7280" }}>Total Value: </span>
            <strong>PHP {Number(pr.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>
      </div>

      <label>
        <span style={labelStyle}>Supplier <span style={{ color: "#e02424" }}>*</span></span>
        <select name="supplierId" required style={inputStyle}>
          <option value="">Select supplier…</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={isPrepaid}
          onChange={(e) => setIsPrepaid(e.target.checked)}
          style={{ width: "16px", height: "16px" }}
        />
        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>This is a prepaid order (requires proforma invoice)</span>
      </label>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <a href="/procurement/pr" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#fcd34d" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem",
          fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Creating PO…" : "Create Purchase Order"}
        </button>
      </div>
    </form>
  );
}
