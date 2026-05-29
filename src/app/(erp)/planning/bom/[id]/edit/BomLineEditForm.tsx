"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDraftBomEntry } from "@/actions/planning";

type Material = { id: string; code: string; name: string; unit: string; adminPrice: string | null; preferredSupplierId: string | null };
type Vendor   = { id: string; name: string };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function BomLineEditForm({
  id,
  initialMaterialId,
  initialQty,
  initialEquipmentType,
  materials,
  vendors,
}: {
  id:                   string;
  initialMaterialId:    string;
  initialQty:           string;
  initialEquipmentType: string;
  materials:            Material[];
  vendors:              Vendor[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error,   setError]   = useState<string | null>(null);

  const [materialId,     setMaterialId]     = useState(initialMaterialId);
  const [qty,            setQty]            = useState(initialQty);
  const [unitPrice,      setUnitPrice]      = useState(() => {
    const mat = materials.find((m) => m.id === initialMaterialId);
    return mat?.adminPrice ?? "";
  });
  const [equipmentType,  setEquipmentType]  = useState(initialEquipmentType);

  const lineTotal = (() => {
    const q = parseFloat(qty);
    const p = parseFloat(unitPrice);
    if (!isNaN(q) && !isNaN(p)) return (q * p).toLocaleString("en-PH", { minimumFractionDigits: 2 });
    return "—";
  })();

  function handleMaterialChange(matId: string) {
    setMaterialId(matId);
    const mat = materials.find((m) => m.id === matId);
    setUnitPrice(mat?.adminPrice ?? "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!materialId || !qty) {
      setError("Material and quantity are required.");
      return;
    }

    startTransition(async () => {
      const result = await updateDraftBomEntry({
        id,
        materialId,
        quantityPerUnit: Number(qty),
        equipmentType:   equipmentType || undefined,
      });

      if (result.success) {
        router.push("/planning/bom");
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

      {/* Material */}
      <label>
        <span style={labelStyle}>Material *</span>
        <select required style={inputStyle} value={materialId} onChange={(e) => handleMaterialChange(e.target.value)}>
          <option value="">Select material…</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.unit})</option>
          ))}
        </select>
      </label>

      {/* Qty + Unit Price */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Qty / Unit *</span>
          <input
            type="number" required min="0.0001" step="0.0001"
            style={inputStyle} value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0.0000"
          />
        </label>
        <label>
          <span style={labelStyle}>Unit Price (PHP)</span>
          <input
            type="number" min="0" step="0.01"
            style={{ ...inputStyle, background: "#f9fafb", color: "#6b7280" }}
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="0.00"
          />
          <span style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.2rem", display: "block" }}>
            From material admin price
          </span>
        </label>
        <div>
          <span style={{ ...labelStyle }}>Line Total</span>
          <div style={{ padding: "0.6rem 0.8rem", border: "1px solid #e5e7eb", borderRadius: "6px", fontFamily: "monospace", fontWeight: 600, color: "#374151", background: "#f9fafb" }}>
            {lineTotal !== "—" ? `₱${lineTotal}` : "—"}
          </div>
        </div>
      </div>

      {/* Equipment Type */}
      <label>
        <span style={labelStyle}>Equipment Type <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></span>
        <input
          type="text" maxLength={100} placeholder="e.g. Mixer, Pump, Crane…"
          style={inputStyle} value={equipmentType}
          onChange={(e) => setEquipmentType(e.target.value)}
        />
      </label>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/planning/bom" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#93c5fd" : "#1a56db",
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
