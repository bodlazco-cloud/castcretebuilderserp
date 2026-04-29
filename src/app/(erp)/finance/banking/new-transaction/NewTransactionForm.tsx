"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBankTransaction } from "@/actions/finance";

const ACCENT = "#ff5a1f";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

type Account = { id: string; bankName: string; accountName: string; accountNumber: string };

export function NewTransactionForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [txnType, setTxnType] = useState<"DEBIT" | "CREDIT">("DEBIT");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createBankTransaction({
        bankAccountId:    fd.get("bankAccountId") as string,
        transactionDate:  fd.get("transactionDate") as string,
        transactionType:  txnType,
        amount:           fd.get("amount") as string,
        description:      fd.get("description") as string,
        referenceNumber:  (fd.get("referenceNumber") as string) || undefined,
        requiresDualAuth: fd.get("requiresDualAuth") === "on",
      });
      if (result.success) router.push("/finance/banking");
      else setError(result.error ?? "Failed to record transaction.");
    });
  }

  const btnBase: React.CSSProperties = {
    padding: "0.5rem 1rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.875rem",
    cursor: "pointer", border: "1px solid transparent", transition: "none",
  };

  return (
    <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {error && (
          <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>
        )}

        <label>
          <span style={labelStyle}>Bank Account <span style={{ color: "#e02424" }}>*</span></span>
          <select name="bankAccountId" required style={inputStyle}>
            <option value="">Select account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.bankName} — {a.accountName} ({a.accountNumber})</option>
            ))}
          </select>
        </label>

        <div>
          <span style={labelStyle}>Transaction Type <span style={{ color: "#e02424" }}>*</span></span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {(["DEBIT", "CREDIT"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTxnType(t)}
                style={{
                  ...btnBase,
                  background: txnType === t ? (t === "DEBIT" ? "#fef2f2" : "#f0fdf4") : "#f9fafb",
                  color: txnType === t ? (t === "DEBIT" ? "#b91c1c" : "#057a55") : "#6b7280",
                  borderColor: txnType === t ? (t === "DEBIT" ? "#fecaca" : "#bbf7d0") : "#e5e7eb",
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label>
            <span style={labelStyle}>Date <span style={{ color: "#e02424" }}>*</span></span>
            <input name="transactionDate" type="date" required style={inputStyle} defaultValue={new Date().toISOString().split("T")[0]} />
          </label>
          <label>
            <span style={labelStyle}>Amount (PHP) <span style={{ color: "#e02424" }}>*</span></span>
            <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" style={inputStyle} />
          </label>
        </div>

        <label>
          <span style={labelStyle}>Description <span style={{ color: "#e02424" }}>*</span></span>
          <input name="description" type="text" required placeholder="Brief description of the transaction" style={inputStyle} />
        </label>

        <label>
          <span style={labelStyle}>Reference Number (optional)</span>
          <input name="referenceNumber" type="text" placeholder="Check no., wire ref., etc." style={inputStyle} />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
          <input name="requiresDualAuth" type="checkbox" style={{ width: "16px", height: "16px" }} />
          <span style={{ fontSize: "0.875rem", color: "#374151" }}>Requires dual authorization (for high-value transactions)</span>
        </label>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <a href="/finance/banking" style={{ padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db", color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Cancel</a>
          <button type="submit" disabled={isPending} style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: isPending ? "#fdba74" : ACCENT,
            color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
          }}>
            {isPending ? "Saving…" : "Record Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
}
