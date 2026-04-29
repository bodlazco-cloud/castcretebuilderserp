"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRfp } from "@/actions/finance";

const ACCENT = "#ff5a1f";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

type Account = { id: string; bankName: string; accountName: string; accountNumber: string };
type CostCenter = { id: string; code: string; name: string };

export function NewRfpForm({ accounts, costCenters }: { accounts: Account[]; costCenters: CostCenter[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createRfp({
        bankAccountId:     (fd.get("bankAccountId") as string) || undefined,
        amount:            fd.get("amount") as string,
        payeeName:         fd.get("payeeName") as string,
        purpose:           fd.get("purpose") as string,
        sourceDocumentUrl: fd.get("sourceDocumentUrl") as string,
        costCenterId:      (fd.get("costCenterId") as string) || undefined,
      });
      if (result.success) router.push(`/finance/rfp/${result.id}`);
      else setError(result.error ?? "Failed to create RFP.");
    });
  }

  return (
    <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {error && (
          <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>
        )}

        <label>
          <span style={labelStyle}>Payee Name <span style={{ color: "#e02424" }}>*</span></span>
          <input name="payeeName" type="text" required placeholder="Name of vendor / payee" style={inputStyle} />
        </label>

        <label>
          <span style={labelStyle}>Amount (PHP) <span style={{ color: "#e02424" }}>*</span></span>
          <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" style={inputStyle} />
        </label>

        <label>
          <span style={labelStyle}>Purpose <span style={{ color: "#e02424" }}>*</span></span>
          <textarea name="purpose" required rows={3} placeholder="Describe the purpose of payment…" style={{ ...inputStyle, resize: "vertical" }} />
        </label>

        <label>
          <span style={labelStyle}>Source Document URL <span style={{ color: "#e02424" }}>*</span></span>
          <input name="sourceDocumentUrl" type="url" required placeholder="https://…" style={inputStyle} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label>
            <span style={labelStyle}>Bank Account (optional)</span>
            <select name="bankAccountId" style={inputStyle}>
              <option value="">— none —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.bankName} ({a.accountNumber})</option>
              ))}
            </select>
          </label>
          <label>
            <span style={labelStyle}>Cost Center (optional)</span>
            <select name="costCenterId" style={inputStyle}>
              <option value="">— none —</option>
              {costCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <a href="/finance/rfp" style={{ padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db", color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Cancel</a>
          <button type="submit" disabled={isPending} style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: isPending ? "#fdba74" : ACCENT,
            color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
          }}>
            {isPending ? "Submitting…" : "Submit RFP"}
          </button>
        </div>
      </form>
    </div>
  );
}
