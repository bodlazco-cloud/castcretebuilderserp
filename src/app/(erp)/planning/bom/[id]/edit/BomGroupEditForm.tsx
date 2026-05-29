"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEditedBomGroup } from "@/actions/planning";

type Material = { id: string; code: string; name: string; unit: string; adminPrice: string | null };
type Vendor   = { id: string; name: string };

type LineItem = {
  _key:          string;    // local React key (not persisted)
  id?:           string;    // DB id if existing
  materialId:    string;
  qty:           string;
  equipmentType: string;
};

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.5rem 0.7rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem",
};

let _keyCounter = 0;
function nextKey() { return String(++_keyCounter); }

function unitPrice(materialId: string, materials: Material[]) {
  return materials.find((m) => m.id === materialId)?.adminPrice ?? "";
}

function lineTotal(qty: string, price: string) {
  const q = parseFloat(qty);
  const p = parseFloat(price);
  if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0)
    return `₱${(q * p).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  return "—";
}

export function BomGroupEditForm({
  referenceId,
  initialLines,
  materials,
  vendors,
}: {
  referenceId:  string;
  initialLines: { id: string; materialId: string; qty: string; equipmentType: string }[];
  materials:    Material[];
  vendors:      Vendor[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [lines, setLines] = useState<LineItem[]>(() =>
    initialLines.map((l) => ({ _key: nextKey(), id: l.id, materialId: l.materialId, qty: l.qty, equipmentType: l.equipmentType }))
  );

  function addLine() {
    setLines((prev) => [...prev, { _key: nextKey(), materialId: "", qty: "", equipmentType: "" }]);
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l._key !== key));
  }

  function setField(key: string, field: keyof Omit<LineItem, "_key" | "id">, value: string) {
    setLines((prev) => prev.map((l) => l._key === key ? { ...l, [field]: value } : l));
  }

  function handleMaterialChange(key: string, matId: string) {
    setLines((prev) => prev.map((l) => l._key === key ? { ...l, materialId: matId } : l));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validLines = lines.filter((l) => l.materialId && l.qty);
    if (validLines.length === 0) {
      setError("At least one material line with a quantity is required.");
      return;
    }

    startTransition(async () => {
      const result = await saveEditedBomGroup({
        referenceId,
        lines: validLines.map((l) => ({
          id:              l.id,
          materialId:      l.materialId,
          quantityPerUnit: Number(l.qty),
          equipmentType:   l.equipmentType || undefined,
        })),
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

      {/* Materials table */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#111827" }}>
            Material Lines
            <span style={{ marginLeft: "0.5rem", fontSize: "0.78rem", fontWeight: 400, color: "#9ca3af" }}>
              {lines.length} line{lines.length !== 1 ? "s" : ""}
            </span>
          </span>
          <button type="button" onClick={addLine} style={{
            padding: "0.35rem 0.85rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600,
            background: "#eff6ff", color: "#1a56db", border: "1px solid #bfdbfe", cursor: "pointer",
          }}>
            + Add Line
          </button>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1.5fr 60px", gap: 0, background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.55rem 0.75rem" }}>
            {["Material", "Qty / Unit", "Unit Price", "Equipment Type", ""].map((h, i) => (
              <span key={i} style={labelStyle}>{h}</span>
            ))}
          </div>

          {lines.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
              No lines — click <strong>+ Add Line</strong> to begin.
            </div>
          ) : (
            lines.map((line, idx) => {
              const price = unitPrice(line.materialId, materials);
              const mat   = materials.find((m) => m.id === line.materialId);
              return (
                <div key={line._key} style={{
                  display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1.5fr 60px",
                  gap: 0, alignItems: "start",
                  padding: "0.6rem 0.75rem",
                  borderBottom: idx < lines.length - 1 ? "1px solid #f3f4f6" : "none",
                  background: "#fff",
                }}>
                  {/* Material */}
                  <div style={{ paddingRight: "0.5rem" }}>
                    <select
                      value={line.materialId}
                      onChange={(e) => handleMaterialChange(line._key, e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select material…</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.unit})</option>
                      ))}
                    </select>
                    {mat && (
                      <span style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.15rem", display: "block" }}>
                        {mat.unit} · {lineTotal(line.qty, price)}
                      </span>
                    )}
                  </div>

                  {/* Qty */}
                  <div style={{ paddingRight: "0.5rem" }}>
                    <input
                      type="number" min="0.0001" step="0.0001"
                      value={line.qty}
                      onChange={(e) => setField(line._key, "qty", e.target.value)}
                      placeholder="0.0000"
                      style={inputStyle}
                    />
                  </div>

                  {/* Unit Price (read-only display) */}
                  <div style={{ paddingRight: "0.5rem" }}>
                    <div style={{ ...inputStyle, background: "#f9fafb", color: "#6b7280", display: "flex", alignItems: "center" }}>
                      {price ? `₱${Number(price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : <span style={{ color: "#d1d5db" }}>—</span>}
                    </div>
                  </div>

                  {/* Equipment Type */}
                  <div style={{ paddingRight: "0.5rem" }}>
                    <input
                      type="text" maxLength={100}
                      value={line.equipmentType}
                      onChange={(e) => setField(line._key, "equipmentType", e.target.value)}
                      placeholder="e.g. Mixer, Pump…"
                      style={inputStyle}
                    />
                  </div>

                  {/* Delete */}
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: "0.3rem" }}>
                    <button
                      type="button"
                      onClick={() => removeLine(line._key)}
                      title="Remove line"
                      style={{
                        background: "none", border: "1px solid #fecaca", borderRadius: "5px",
                        cursor: "pointer", color: "#dc2626", fontSize: "0.875rem",
                        width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/planning/bom" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending || lines.length === 0} style={{
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
