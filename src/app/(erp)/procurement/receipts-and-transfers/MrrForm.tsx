"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMrr } from "@/actions/procurement";

type Project  = { id: string; name: string };
type Supplier = { id: string; name: string };
type Material = { id: string; code: string; name: string; unit: string };
type PoOption = { id: string; label: string };

type LineItem = { materialId: string; quantityReceived: string; unitPrice: string; shadowPrice: string };

const ACCENT = "#e3a008";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function MrrForm({
  projects, suppliers, materials, poOptions, defaultPoId,
}: {
  projects:   Project[];
  suppliers:  Supplier[];
  materials:  Material[];
  poOptions:  PoOption[];
  defaultPoId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"SUPPLIER" | "DEVELOPER_OSM">("SUPPLIER");
  const [lines, setLines] = useState<LineItem[]>([{ materialId: "", quantityReceived: "", unitPrice: "", shadowPrice: "" }]);

  function addLine() { setLines((l) => [...l, { materialId: "", quantityReceived: "", unitPrice: "", shadowPrice: "" }]); }
  function removeLine(i: number) { setLines((l) => l.filter((_, idx) => idx !== i)); }
  function setLine(i: number, field: keyof LineItem, val: string) {
    setLines((l) => l.map((line, idx) => idx === i ? { ...line, [field]: val } : line));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const validLines = lines.filter((l) => l.materialId && l.quantityReceived);
    if (validLines.length === 0) { setError("At least one material line is required."); return; }

    startTransition(async () => {
      const result = await createMrr({
        poId:         (fd.get("poId") as string) || undefined,
        projectId:    fd.get("projectId") as string,
        supplierId:   (fd.get("supplierId") as string) || undefined,
        sourceType,
        receivedDate: fd.get("receivedDate") as string,
        notes:        (fd.get("notes") as string) || undefined,
        items: validLines.map((l) => ({
          materialId:       l.materialId,
          quantityReceived: Number(l.quantityReceived),
          unitPrice:        Number(l.unitPrice) || 0,
          shadowPrice:      Number(l.shadowPrice) || 0,
        })),
      });
      if (result.success) {
        router.push(`/procurement/receipts-and-transfers/${result.mrrId}`);
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

      {/* Source type toggle */}
      <div>
        <div style={labelStyle}>Source Type <span style={{ color: "#e02424" }}>*</span></div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["SUPPLIER", "DEVELOPER_OSM"] as const).map((st) => (
            <button key={st} type="button" onClick={() => setSourceType(st)} style={{
              flex: 1, padding: "0.5rem", borderRadius: "6px", border: "2px solid",
              borderColor: sourceType === st ? ACCENT : "#d1d5db",
              background: sourceType === st ? "#fffbeb" : "#fff",
              color: sourceType === st ? "#92400e" : "#374151",
              fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
            }}>
              {st === "SUPPLIER" ? "From Supplier" : "Developer OSM"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Project <span style={{ color: "#e02424" }}>*</span></span>
          <select name="projectId" required style={inputStyle}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Received Date <span style={{ color: "#e02424" }}>*</span></span>
          <input name="receivedDate" type="date" required style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {sourceType === "SUPPLIER" && (
          <label>
            <span style={labelStyle}>Supplier</span>
            <select name="supplierId" style={inputStyle}>
              <option value="">Select supplier…</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
        {poOptions.length > 0 && (
          <label>
            <span style={labelStyle}>Linked PO (optional)</span>
            <select name="poId" style={inputStyle} defaultValue={defaultPoId ?? ""}>
              <option value="">No linked PO</option>
              {poOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
        )}
      </div>

      {/* Material lines */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Materials Received <span style={{ color: "#e02424" }}>*</span></span>
          <button type="button" onClick={addLine} style={{
            padding: "0.35rem 0.85rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600,
            background: "#fffbeb", color: "#92400e", border: `1px solid ${ACCENT}`, cursor: "pointer",
          }}>+ Add Line</button>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "640px" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Material", "Qty Received", "Unit Price (PHP)", "Shadow Price", ""].map((h, i) => (
                    <th key={i} style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", width: i === 4 ? "40px" : undefined }}>{h}</th>
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
                        {materials.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.unit})</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <input type="number" min="0.0001" step="0.0001" value={line.quantityReceived}
                        onChange={(e) => setLine(i, "quantityReceived", e.target.value)}
                        placeholder="0.0000" style={{ ...inputStyle, margin: 0 }} />
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <input type="number" min="0" step="0.01" value={line.unitPrice}
                        onChange={(e) => setLine(i, "unitPrice", e.target.value)}
                        placeholder="0.00" style={{ ...inputStyle, margin: 0 }} />
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <input type="number" min="0" step="0.01" value={line.shadowPrice}
                        onChange={(e) => setLine(i, "shadowPrice", e.target.value)}
                        placeholder="0.00" style={{ ...inputStyle, margin: 0 }} />
                    </td>
                    <td style={{ padding: "0.5rem", textAlign: "center" }}>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(i)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "1rem" }}>✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <label>
        <span style={labelStyle}>Notes (optional)</span>
        <textarea name="notes" rows={2} placeholder="Any receiving notes…" style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <a href="/procurement/receipts-and-transfers" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#fcd34d" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem",
          fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Recording…" : "Record Receipt"}
        </button>
      </div>
    </form>
  );
}
