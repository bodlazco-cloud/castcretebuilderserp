"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPunchListItem } from "@/actions/audit";

const ACCENT = "#7e3af2";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

const CATEGORIES = ["Structural", "Architectural", "MEP", "Finishing", "Waterproofing", "Safety", "Other"];

// This page is a client component so it can fetch data client-side via a form
// and use useTransition. Projects/units are passed via searchParams pre-selection
// but the form is self-contained with a free-text project name for simplicity.
// A proper implementation would preload from server; we wire the action directly.

export default function NewPunchListItemPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Note: projectId is required by schema — we use a text input for the UUID
  // In production this would be a server component loading project list.
  // For now we accept raw UUIDs since projects are managed in master-list.

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createPunchListItem({
        projectId: fd.get("projectId") as string,
        unitId:    (fd.get("unitId") as string) || undefined,
        item:      fd.get("item") as string,
        category:  fd.get("category") as string,
        dueDate:   (fd.get("dueDate") as string) || undefined,
      });
      if (result.success) router.push(`/audit/qa-punch-list/${result.id}`);
      else setError(result.error);
    });
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "680px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit/qa-punch-list" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← QA Punch List</a>
        </div>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Add Punch List Item</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Record a quality defect or open issue for tracking and closeout.</p>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {error && (
              <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label>
                <span style={labelStyle}>Project ID <span style={{ color: "#e02424" }}>*</span></span>
                <input name="projectId" type="text" required placeholder="UUID of the project" style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Unit ID (optional)</span>
                <input name="unitId" type="text" placeholder="UUID of the unit" style={inputStyle} />
              </label>
            </div>

            <label>
              <span style={labelStyle}>Category <span style={{ color: "#e02424" }}>*</span></span>
              <select name="category" required style={inputStyle}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label>
              <span style={labelStyle}>Item / Defect Description <span style={{ color: "#e02424" }}>*</span></span>
              <textarea name="item" required rows={4} placeholder="Describe the quality issue in detail…" style={{ ...inputStyle, resize: "vertical" }} />
            </label>

            <label>
              <span style={labelStyle}>Due Date (optional)</span>
              <input name="dueDate" type="date" style={inputStyle} />
            </label>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <a href="/audit/qa-punch-list" style={{ padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db", color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Cancel</a>
              <button type="submit" disabled={isPending} style={{
                padding: "0.65rem 1.5rem", borderRadius: "6px",
                background: isPending ? "#c4b5fd" : ACCENT,
                color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer",
              }}>
                {isPending ? "Saving…" : "Add Item"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
