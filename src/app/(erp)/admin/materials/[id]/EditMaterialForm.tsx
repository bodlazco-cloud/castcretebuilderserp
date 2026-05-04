"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMaterial } from "@/actions/master-list";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.5rem 0.75rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem",
};

type Supplier = { id: string; name: string };

export function EditMaterialForm({
  id, initial, suppliers,
}: {
  id: string;
  initial: { code: string; name: string; unit: string; category: string; preferredSupplierId?: string };
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [code, setCode]   = useState(initial.code);
  const [name, setName]   = useState(initial.name);
  const [unit, setUnit]   = useState(initial.unit);
  const [category, setCat] = useState(initial.category);
  const [supplierId, setSupplierId] = useState(initial.preferredSupplierId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateMaterial(id, { code, name, unit, category, preferredSupplierId: supplierId || undefined });
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        padding: "0.5rem 1rem", borderRadius: "6px", background: "#f3f4f6",
        color: "#374151", border: "1px solid #d1d5db", fontSize: "0.8rem",
        fontWeight: 600, cursor: "pointer",
      }}>
        Edit Details
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.25rem", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
      <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#374151", marginBottom: "0.25rem" }}>Edit Material Details</div>
      {error && <div style={{ padding: "0.6rem 0.85rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label><span style={labelStyle}>Code *</span>
          <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} style={inputStyle} />
        </label>
        <label><span style={labelStyle}>Unit *</span>
          <input type="text" required value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle} />
        </label>
      </div>
      <label><span style={labelStyle}>Name *</span>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </label>
      <label><span style={labelStyle}>Category *</span>
        <input type="text" required value={category} onChange={(e) => setCat(e.target.value)} style={inputStyle} />
      </label>
      <label><span style={labelStyle}>Preferred Supplier</span>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={inputStyle}>
          <option value="">None</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button type="submit" disabled={isPending} style={{
          padding: "0.5rem 1rem", borderRadius: "6px", background: isPending ? "#fca5a5" : "#dc2626",
          color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        }}>{isPending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} style={{
          padding: "0.5rem 0.85rem", borderRadius: "6px", background: "#fff",
          border: "1px solid #d1d5db", color: "#374151", fontSize: "0.8rem", cursor: "pointer",
        }}>Cancel</button>
      </div>
    </form>
  );
}
