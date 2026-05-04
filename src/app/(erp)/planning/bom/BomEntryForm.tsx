"use client";

import { useState, useTransition } from "react";
import { saveBomEntries } from "@/actions/planning";

type SowItem  = { id: string; scopeName: string; activityCode: string };
type Material = { id: string; code: string; name: string; unit: string };
type Vendor   = { id: string; name: string };

const ACCENT = "#1a56db";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

const UNIT_TYPES = [
  { value: "BEG", label: "BEG — Beginning Unit" },
  { value: "REG", label: "REG — Regular Unit" },
  { value: "END", label: "END — End Unit" },
];

type LineItem = { materialId: string; qty: string; unitPrice: string; preferredSupplierId: string };

export function BomEntryForm({ sowItems, materials, vendors }: {
  sowItems:  SowItem[];
  materials: Material[];
  vendors:   Vendor[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedSow, setSelectedSow] = useState("");
  const [unitModel,   setUnitModel]   = useState("");
  const [unitType,    setUnitType]    = useState("");
  const [lines, setLines] = useState<LineItem[]>([
    { materialId: "", qty: "", unitPrice: "", preferredSupplierId: "" },
  ]);

  function addLine() {
    setLines((l) => [...l, { materialId: "", qty: "", unitPrice: "", preferredSupplierId: "" }]);
  }
  function removeLine(i: number) { setLines((l) => l.filter((_, idx) => idx !== i)); }
  function setLine(i: number, field: keyof LineItem, val: string) {
    setLines((l) => l.map((line, idx) => idx === i ? { ...line, [field]: val } : line));
  }
  function lineTotal(line: LineItem) {
    const q = parseFloat(line.qty);
    const p = parseFloat(line.unitPrice);
    if (!isNaN(q) && !isNaN(p)) return (q * p).toLocaleString("en-PH", { minimumFractionDigits: 2 });
    return "—";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null);

    const items = lines
      .filter((l) => l.materialId && l.qty)
      .map((l) => ({
        materialId: l.materialId,
        quantityPerUnit: Number(l.qty),
        unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
        preferredSupplierId: l.preferredSupplierId || undefined,
      }));

    if (!selectedSow || !unitModel || !unitType || items.length === 0) {
      setError("Please fill in all required fields and at least one material line.");
      return;
    }

    startTransition(async () => {
      const result = await saveBomEntries({
        activityDefId: selectedSow,
        unitModel,
        unitType: unitType as "BEG" | "REG" | "END",
        items,
      });
      if (result.success) {
        setSuccess(`Saved ${result.inserted} BOM line(s). Previous entries for this scope were versioned out. `);
        setLines([{ materialId: "", qty: "", unitPrice: "", preferredSupplierId: "" }]);
        setSelectedSow("");
        setUnitModel("");
        setUnitType("");
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
        <div style={{ padding: "0.85rem 1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", color: "#166534", fontSize: "0.875rem" }}>
          {success}
        </div>
      )}

      {/* Scope of Work */}
      <label>
        <span style={labelStyle}>Scope of Work *</span>
        <select required style={inputStyle} value={selectedSow}
          onChange={(e) => setSelectedSow(e.target.value)}>
          <option value="">Select scope…</option>
          {sowItems.map((s) => (
            <option key={s.id} value={s.id}>[{s.activityCode}] {s.scopeName}</option>
          ))}
        </select>
      </label>

      {/* Unit Model (free-text, project-specific) + Unit Type */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Unit Model *</span>
          <input
            type="text" required placeholder="e.g. Type A, 2BR-Corner, Studio…"
            style={inputStyle} value={unitModel}
            onChange={(e) => setUnitModel(e.target.value)} />
          <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.2rem", display: "block" }}>
            Enter the unit model as defined for this project
          </span>
        </label>
        <label>
          <span style={labelStyle}>Unit Type *</span>
          <select required style={inputStyle} value={unitType} onChange={(e) => setUnitType(e.target.value)}>
            <option value="">Select type…</option>
            {UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>

      {/* Materials table */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Materials *</span>
          <button type="button" onClick={addLine} style={{
            padding: "0.35rem 0.85rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600,
            background: "#eff6ff", color: ACCENT, border: `1px solid ${ACCENT}`, cursor: "pointer",
          }}>+ Add Line</button>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "720px" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Material", "Qty / Unit", "Unit Price (PHP)", "Total", "Preferred Supplier", ""].map((h, i) => (
                    <th key={i} style={{
                      padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600,
                      color: "#374151", borderBottom: "1px solid #e5e7eb",
                      width: i === 5 ? "40px" : i === 3 ? "100px" : undefined,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} style={{ borderBottom: i < lines.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <select value={line.materialId} onChange={(e) => setLine(i, "materialId", e.target.value)}
                        style={{ ...inputStyle, margin: 0 }}>
                        <option value="">Select material…</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.unit})</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <input type="number" min="0.0001" step="0.0001" value={line.qty}
                        onChange={(e) => setLine(i, "qty", e.target.value)}
                        placeholder="0.0000" style={{ ...inputStyle, margin: 0 }} />
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <input type="number" min="0" step="0.01" value={line.unitPrice}
                        onChange={(e) => setLine(i, "unitPrice", e.target.value)}
                        placeholder="0.00" style={{ ...inputStyle, margin: 0 }} />
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
                      {lineTotal(line)}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <select value={line.preferredSupplierId}
                        onChange={(e) => setLine(i, "preferredSupplierId", e.target.value)}
                        style={{ ...inputStyle, margin: 0 }}>
                        <option value="">No preference</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(i)} style={{
                          background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "1rem",
                        }}>✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/planning/bom" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#93c5fd" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
          cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save BOM"}
        </button>
      </div>
    </form>
  );
}
