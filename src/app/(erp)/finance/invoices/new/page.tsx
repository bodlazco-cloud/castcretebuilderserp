"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateInvoice } from "@/actions/finance";

const ACCENT = "#ff5a1f";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export default function GenerateInvoicePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await generateInvoice({
        warId:            fd.get("warId") as string,
        lessDpRecovery:   (fd.get("lessDpRecovery") as string) || undefined,
        lessOsmDeduction: (fd.get("lessOsmDeduction") as string) || undefined,
        lessRetention:    (fd.get("lessRetention") as string) || undefined,
      });
      if (result.success) router.push(`/finance/invoices/${result.id}`);
      else setError(result.error ?? "Failed to generate invoice.");
    });
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "640px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance/invoices" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Invoices</a>
        </div>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Generate Invoice</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            Creates a billing invoice from an APPROVED Work Accomplished Report. Provide the WAR ID and any applicable deductions.
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {error && (
              <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>
            )}

            <label>
              <span style={labelStyle}>WAR ID <span style={{ color: "#e02424" }}>*</span></span>
              <input name="warId" type="text" required placeholder="UUID of the approved WAR" style={inputStyle} />
              <span style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: "0.25rem", display: "block" }}>
                WAR must have status APPROVED. Find it at Construction → WAR register.
              </span>
            </label>

            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1.25rem" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>Deductions (PHP, optional)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <label>
                  <span style={labelStyle}>DP Recovery</span>
                  <input name="lessDpRecovery" type="number" step="0.01" min="0" placeholder="0.00" style={inputStyle} />
                </label>
                <label>
                  <span style={labelStyle}>OSM Deduction</span>
                  <input name="lessOsmDeduction" type="number" step="0.01" min="0" placeholder="0.00" style={inputStyle} />
                </label>
                <label>
                  <span style={labelStyle}>Retention</span>
                  <input name="lessRetention" type="number" step="0.01" min="0" placeholder="0.00" style={inputStyle} />
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <a href="/finance/invoices" style={{ padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db", color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Cancel</a>
              <button type="submit" disabled={isPending} style={{
                padding: "0.65rem 1.5rem", borderRadius: "6px",
                background: isPending ? "#fdba74" : ACCENT,
                color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer",
              }}>
                {isPending ? "Generating…" : "Generate Invoice"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
