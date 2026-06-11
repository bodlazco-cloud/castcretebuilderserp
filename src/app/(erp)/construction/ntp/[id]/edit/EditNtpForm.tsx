"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateNtp } from "@/actions/construction";

type Subcon   = { id: string; name: string; code: string; tradeTypes: string[] };
type Category = { id: string; code: string; name: string; sequenceOrder: number };
type Scope    = { id: string; code: string; name: string; categoryId: string; sequenceOrder: number };

const ACCENT = "#057a55";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px",
  fontSize: "0.9rem", boxSizing: "border-box", background: "#fff",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600,
  color: "#374151", marginBottom: "0.35rem",
};

export function EditNtpForm({
  ntpId, initial, subcontractors, categories, scopes,
}: {
  ntpId: string;
  initial: { subconId: string; startDate: string; endDate: string; phaseScopeId: string };
  subcontractors: Subcon[];
  categories: Category[];
  scopes: Scope[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Find which category the current scope belongs to
  const currentScope = scopes.find((s) => s.id === initial.phaseScopeId);
  const currentCategoryId = currentScope?.categoryId ?? "";

  const [selectedCategory, setSelectedCategory] = useState(currentCategoryId);
  const [selectedScope,    setSelectedScope]    = useState(initial.phaseScopeId);
  const [subconId,  setSubconId]  = useState(initial.subconId);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate,   setEndDate]   = useState(initial.endDate);

  const filteredScopes = scopes.filter((s) => !selectedCategory || s.categoryId === selectedCategory);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedScope) { setError("Select a Scope of Work."); return; }
    setError(null);
    startTransition(async () => {
      const result = await updateNtp({
        ntpId,
        subconId,
        phaseScopeId: selectedScope || undefined,
        workType: "STRUCTURAL",
        startDate,
        endDate,
      });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => router.push(`/construction/ntp/${ntpId}`), 800);
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
      {success && (
        <div style={{ padding: "0.85rem 1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: ACCENT, fontSize: "0.875rem" }}>
          NTP updated. Redirecting…
        </div>
      )}

      {/* Phase: Category + Scope */}
      <div style={{ padding: "1rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Construction Phase
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label>
            <span style={labelStyle}>Category</span>
            <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedScope(""); }} style={inputStyle}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            <span style={labelStyle}>Scope of Work <span style={{ color: "#e02424" }}>*</span></span>
            <select value={selectedScope} onChange={(e) => setSelectedScope(e.target.value)} style={inputStyle} required>
              <option value="">Select scope…</option>
              {filteredScopes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Subcontractor */}
      <label>
        <span style={labelStyle}>Subcontractor <span style={{ color: "#e02424" }}>*</span></span>
        <select value={subconId} onChange={(e) => setSubconId(e.target.value)} style={inputStyle} required>
          <option value="">Select subcontractor…</option>
          {subcontractors.map((s) => (
            <option key={s.id} value={s.id}>{s.code} — {s.name} ({s.tradeTypes.join(", ")})</option>
          ))}
        </select>
      </label>

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Start Date <span style={{ color: "#e02424" }}>*</span></span>
          <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>End Date <span style={{ color: "#e02424" }}>*</span></span>
          <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href={`/construction/ntp/${ntpId}`} style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#6ee7b7" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
