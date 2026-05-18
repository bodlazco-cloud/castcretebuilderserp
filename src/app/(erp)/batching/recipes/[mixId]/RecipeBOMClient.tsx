"use client";

import { useState, useTransition } from "react";
import { addBomIngredient, deleteBomIngredient } from "@/actions/batching-bom";

const ACCENT = "#1a56db";

interface BomItem {
  id: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  requiredQuantity: string;
  unitOfMeasure: string;
  notes: string | null | undefined;
}

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
}

interface Props {
  mixId: string;
  mixCode: string;
  initialItems: BomItem[];
  allMaterials: Material[];
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.45rem 0.6rem", border: "1px solid #d1d5db",
  borderRadius: "6px", fontSize: "0.82rem", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.2rem",
};

export function RecipeBOMClient({ mixId, mixCode, initialItems, allMaterials }: Props) {
  const [items, setItems] = useState<BomItem[]>(initialItems);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const materialId = fd.get("materialId") as string;
    const mat = allMaterials.find((m) => m.id === materialId);
    startTransition(async () => {
      setError(null);
      const res = await addBomIngredient({
        mixDesignId:      mixId,
        materialId,
        requiredQuantity: parseFloat(fd.get("requiredQuantity") as string),
        unitOfMeasure:    fd.get("unitOfMeasure") as string,
        sortOrder:        items.length,
        notes:            (fd.get("notes") as string) || undefined,
      });
      if (res.success) {
        setItems((prev) => [
          ...prev,
          {
            id:               res.id,
            materialId,
            materialName:     mat?.name ?? "—",
            materialCode:     mat?.code ?? "",
            requiredQuantity: fd.get("requiredQuantity") as string,
            unitOfMeasure:    fd.get("unitOfMeasure") as string,
            notes:            (fd.get("notes") as string) || null,
          },
        ]);
        setShowAdd(false);
        (e.target as HTMLFormElement).reset();
      } else {
        setError(res.error);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteBomIngredient(id, mixId);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    });
  }

  return (
    <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "1rem 1.5rem",
        borderBottom: "1px solid #f3f4f6",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
            Recipe Components
          </h3>
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
            Raw material breakdown per 1 m³ of {mixCode}
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          style={{
            padding: "0.45rem 0.85rem", background: showAdd ? "#f3f4f6" : ACCENT,
            color: showAdd ? "#374151" : "#fff", border: "none", borderRadius: "6px",
            fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          {showAdd ? "Cancel" : "+ Add Ingredient"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} style={{ padding: "1rem 1.5rem", background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.65rem", alignItems: "end" }}>
            <div>
              <label style={labelStyle}>Raw Material</label>
              <select name="materialId" required style={inputStyle}>
                <option value="">Select material…</option>
                {allMaterials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Qty per 1 m³</label>
              <input name="requiredQuantity" type="number" step="0.0001" min="0.0001" required placeholder="350.0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Unit (KG / LITERS / BAG)</label>
              <input name="unitOfMeasure" required placeholder="KG" maxLength={10} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <label style={labelStyle}>Notes (optional)</label>
            <input name="notes" placeholder="e.g. Type I Portland Cement" style={inputStyle} />
          </div>
          {error && (
            <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "#fef2f2", color: "#dc2626", borderRadius: "6px", fontSize: "0.78rem" }}>
              {error}
            </div>
          )}
          <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={isPending} style={{
              padding: "0.45rem 0.9rem", background: ACCENT, color: "#fff",
              border: "none", borderRadius: "6px", fontSize: "0.78rem",
              fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1,
            }}>
              {isPending ? "Saving…" : "Add to Recipe"}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {items.length === 0 ? (
        <div style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
          No ingredients defined yet. Add the raw materials that compose 1 m³ of this mix.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Material Code</th>
                <th style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Material Name</th>
                <th style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Required Qty</th>
                <th style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>UOM</th>
                <th style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Notes</th>
                <th style={{ padding: "0.65rem 0.75rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "0.65rem 1rem" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, color: ACCENT, fontSize: "0.78rem" }}>
                      {item.materialCode || `#RAW-${item.materialId.slice(0, 8)}`}
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500 }}>
                    {item.materialName}
                  </td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>
                    {parseFloat(item.requiredQuantity).toFixed(4)}
                  </td>
                  <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontWeight: 500 }}>
                    {item.unitOfMeasure}
                  </td>
                  <td style={{ padding: "0.65rem 1rem", color: "#9ca3af", fontSize: "0.78rem", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.notes ?? "—"}
                  </td>
                  <td style={{ padding: "0.65rem 0.75rem" }}>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isPending}
                      title="Remove ingredient"
                      style={{
                        padding: "0.2rem 0.45rem", background: "transparent",
                        border: "1px solid #fca5a5", borderRadius: "4px",
                        color: "#dc2626", fontSize: "0.7rem", cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Total row summary */}
      {items.length > 0 && (
        <div style={{ padding: "0.75rem 1.5rem", background: "#f9fafb", borderTop: "1px solid #f3f4f6", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            <strong style={{ color: "#111827" }}>{items.length}</strong> ingredients defined for 1 m³ batch
          </span>
        </div>
      )}
    </div>
  );
}
