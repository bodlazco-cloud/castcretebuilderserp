"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBankAccount } from "@/actions/finance";

const ACCENT = "#ff5a1f";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

const ACCOUNT_TYPES = [
  { value: "CHECKING",     label: "Checking" },
  { value: "SAVINGS",      label: "Savings" },
  { value: "TIME_DEPOSIT", label: "Time Deposit" },
  { value: "PAYROLL",      label: "Payroll" },
];

export function AddBankAccountForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [bankName,       setBankName]       = useState("");
  const [accountName,    setAccountName]    = useState("");
  const [accountNumber,  setAccountNumber]  = useState("");
  const [accountType,    setAccountType]    = useState<"CHECKING" | "SAVINGS" | "TIME_DEPOSIT" | "PAYROLL">("CHECKING");
  const [currency,       setCurrency]       = useState("PHP");
  const [openingBalance, setOpeningBalance] = useState("0");

  function reset() {
    setBankName(""); setAccountName(""); setAccountNumber("");
    setAccountType("CHECKING"); setCurrency("PHP"); setOpeningBalance("0");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createBankAccount({
        bankName, accountName, accountNumber, accountType,
        currency, openingBalance: Number(openingBalance),
      });
      if (result.success) {
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#fff",
        color: ACCENT, border: `1px solid ${ACCENT}`, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
      }}>+ Add Bank Account</button>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div style={{
        background: "#fff", borderRadius: "10px", padding: "1.75rem",
        width: "100%", maxWidth: "480px", boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
        fontFamily: "system-ui, sans-serif",
      }}>
        <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>
          Add Bank Account
        </h2>

        {error && (
          <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label>
              <span style={labelStyle}>Bank Name *</span>
              <input type="text" required value={bankName} onChange={(e) => setBankName(e.target.value)}
                placeholder="BDO, BPI, MetroBank…" style={inputStyle} />
            </label>
            <label>
              <span style={labelStyle}>Account Type *</span>
              <select required value={accountType} onChange={(e) => setAccountType(e.target.value as typeof accountType)} style={inputStyle}>
                {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>

          <label>
            <span style={labelStyle}>Account Name *</span>
            <input type="text" required value={accountName} onChange={(e) => setAccountName(e.target.value)}
              placeholder="Castcrete Builders Inc." style={inputStyle} />
          </label>

          <label>
            <span style={labelStyle}>Account Number *</span>
            <input type="text" required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="0000-0000-0000" style={inputStyle} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <label>
              <span style={labelStyle}>Currency</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
                <option value="PHP">PHP</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label>
              <span style={labelStyle}>Opening Balance</span>
              <input type="number" min="0" step="0.01" value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button type="button" onClick={() => { setOpen(false); reset(); }} style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#f3f4f6",
              color: "#374151", border: "1px solid #d1d5db", fontSize: "0.875rem", cursor: "pointer",
            }}>Cancel</button>
            <button type="submit" disabled={isPending} style={{
              padding: "0.55rem 1.25rem", borderRadius: "6px",
              background: isPending ? "#fdb49a" : ACCENT,
              color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600,
              cursor: isPending ? "not-allowed" : "pointer",
            }}>{isPending ? "Saving…" : "Save Account"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
