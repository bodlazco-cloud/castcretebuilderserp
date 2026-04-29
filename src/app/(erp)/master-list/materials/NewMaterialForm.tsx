"use client";

import { useState, useTransition } from "react";
import { createMaterial } from "@/actions/master-list";
import { useRouter } from "next/navigation";

type Supplier = { id: string; name: string };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

const CATEGORIES = ["CEMENT", "REBARS", "LUMBER", "CHB", "AGGREGATES", "TILES", "PAINT", "ELECTRICAL", "PLUMBING", "HARDWARE", "FINISHING", "OTHER"];

export function NewMaterialForm({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [code, setCode]                               = useState("");
  const [name, setName]                               = useState("");
  const [unit, setUnit]                               = useState("");
  const [category, setCategory]                       = useState("");
  const [adminPrice, setAdminPrice]                   = useState("");
  const [preferredSupplierId, setPreferredSupplierId] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createMaterial({
        code, name, unit, category,
        adminPrice: Number(adminPrice),
        preferredSupplierId: preferredSupplierId || undefined,
      });
      if (result.success) {
        router.push(`/master-list/materials/${result.id}`);
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Material Code *</span>
          <input type="text" required value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. CEM-42N" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Material Name *</span>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Portland Cement 42.5N (50kg bag)" style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Unit of Measure *</span>
          <input type="text" required value={unit} onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. bag, kg, pc, lm, m2" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Category *</span>
          <select required value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            <option value="">Select category…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Admin Price (PHP) *</span>
          <input type="number" required min="0" step="0.01" value={adminPrice}
            onChange={(e) => setAdminPrice(e.target.value)} placeholder="0.00" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Preferred Supplier</span>
          <select value={preferredSupplierId} onChange={(e) => setPreferredSupplierId(e.target.value)} style={inputStyle}>
            <option value="">No preference</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/master-list/materials" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#a5b4fc" : "#6366f1",
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save Material"}
        </button>
      </div>
    </form>
  );
}
