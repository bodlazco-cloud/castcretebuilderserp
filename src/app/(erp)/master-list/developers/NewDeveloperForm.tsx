"use client";

import { useState, useTransition } from "react";
import { createDeveloper } from "@/actions/master-list";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function NewDeveloperForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDeveloper({ name });
      if (result.success) {
        router.push(`/master-list/developers/${result.id}`);
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

      <label>
        <span style={labelStyle}>Developer Name *</span>
        <input
          type="text" required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Filinvest Land, Inc." style={inputStyle}
        />
      </label>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/master-list/developers" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#a5b4fc" : "#6366f1",
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save Developer"}
        </button>
      </div>
    </form>
  );
}
