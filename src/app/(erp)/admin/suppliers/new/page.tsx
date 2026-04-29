"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupplier } from "@/actions/admin";

const ACCENT = "#dc2626";

export default function NewSupplierPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Supplier name is required."); return; }
    startTransition(async () => {
      const result = await createSupplier({ name: name.trim() });
      if (result.success) router.push("/admin/suppliers");
      else setError(result.error ?? "Failed to create supplier.");
    });
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "480px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/suppliers" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Suppliers</a>
        </div>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Add Supplier</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Register a new supplier in the master list.</p>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {error && (
              <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>
            )}
            <label>
              <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>
                Supplier Name <span style={{ color: "#e02424" }}>*</span>
              </span>
              <input
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Holcim Philippines"
                style={{ display: "block", width: "100%", padding: "0.6rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box" }}
              />
            </label>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <a href="/admin/suppliers" style={{ padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db", color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Cancel</a>
              <button type="submit" disabled={isPending} style={{
                padding: "0.65rem 1.5rem", borderRadius: "6px",
                background: isPending ? "#fca5a5" : ACCENT,
                color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer",
              }}>
                {isPending ? "Saving…" : "Add Supplier"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
