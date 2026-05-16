"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVendorPriceEntry, deleteVendorPriceEntry } from "@/actions/master-list";

type VendorRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  unitPrice: string | null;
  uom: string | null;
  effectiveDate: string | null;
  notes: string | null;
};

type SupplierOption = { id: string; name: string };

const TH: React.CSSProperties = { padding: "0.6rem 0.9rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.8rem", whiteSpace: "nowrap" };
const TD: React.CSSProperties = { padding: "0.6rem 0.9rem", fontSize: "0.85rem", color: "#374151", verticalAlign: "middle" };
const INPUT: React.CSSProperties = { width: "100%", padding: "0.35rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "5px", fontSize: "0.82rem", color: "#111827", background: "#fff" };
const BTN_SM = (color: string): React.CSSProperties => ({ padding: "0.25rem 0.6rem", fontSize: "0.75rem", fontWeight: 600, border: "none", borderRadius: "5px", cursor: "pointer", background: color, color: "#fff" });

function fmt(v: string | null) {
  if (!v) return "—";
  return `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function VendorEntry({ row, materialId, isBest }: { row: VendorRow; materialId: string; isBest: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function del() {
    startTransition(async () => {
      await deleteVendorPriceEntry(row.id, row.supplierId, materialId);
      router.refresh();
    });
  }

  return (
    <tr style={{ borderBottom: "1px solid #f3f4f6", background: isBest ? "rgba(22,163,74,0.04)" : undefined }}>
      <td style={TD}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <a href={`/master-list/vendors/${row.supplierId}`} style={{ color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>{row.supplierName}</a>
          {isBest && (
            <span style={{ display: "inline-block", padding: "0.1rem 0.45rem", background: "#dcfce7", color: "#166534", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700 }}>
              ★ Best Price
            </span>
          )}
        </div>
      </td>
      <td style={{ ...TD, fontWeight: isBest ? 700 : 500, color: isBest ? "#166534" : "#111827" }}>{fmt(row.unitPrice)}</td>
      <td style={{ ...TD, color: "#6b7280" }}>{row.uom ?? "—"}</td>
      <td style={{ ...TD, color: "#6b7280" }}>{row.effectiveDate ?? "—"}</td>
      <td style={{ ...TD, color: "#6b7280", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.notes ?? "—"}</td>
      <td style={{ ...TD, whiteSpace: "nowrap" }}>
        {confirm
          ? <><button onClick={del} disabled={pending} style={BTN_SM("#dc2626")}>{pending ? "…" : "Confirm"}</button>{" "}<button onClick={() => setConfirm(false)} style={BTN_SM("#6b7280")}>Cancel</button></>
          : <button onClick={() => setConfirm(true)} style={BTN_SM("#ef4444")}>Remove</button>
        }
      </td>
    </tr>
  );
}

function AddVendorPriceForm({ materialId, suppliers, existingSupplierIds }: { materialId: string; suppliers: SupplierOption[]; existingSupplierIds: Set<string> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [supId, setSupId] = useState("");
  const [price, setPrice] = useState("");
  const [uom, setUom] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  const available = suppliers.filter(s => !existingSupplierIds.has(s.id));

  function submit() {
    setErr("");
    if (!supId) { setErr("Select a vendor"); return; }
    const p = parseFloat(price);
    if (!p || p <= 0) { setErr("Enter a valid price"); return; }
    startTransition(async () => {
      const res = await addVendorPriceEntry(supId, { materialId, unitPrice: p, uom: uom || undefined, effectiveDate: date || undefined, notes: notes || undefined });
      if (res.success) { router.refresh(); setOpen(false); setSupId(""); setPrice(""); setUom(""); setDate(""); setNotes(""); }
      else setErr(res.error ?? "Error");
    });
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ padding: "0.45rem 1rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
      + Add Vendor Price
    </button>
  );

  return (
    <div style={{ background: "#f8f9ff", border: "1px solid #e0e7ff", borderRadius: "8px", padding: "1rem", marginTop: "0.75rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 2fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "0.2rem" }}>Vendor / Supplier *</label>
          <select value={supId} onChange={e => setSupId(e.target.value)} style={INPUT}>
            <option value="">Select vendor…</option>
            {available.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "0.2rem" }}>Unit Price (PHP) *</label>
          <input style={INPUT} type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "0.2rem" }}>UOM</label>
          <input style={INPUT} value={uom} onChange={e => setUom(e.target.value)} placeholder="bag, cu.m…" />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "0.2rem" }}>Effective Date</label>
          <input style={INPUT} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "0.2rem" }}>Notes</label>
          <input style={INPUT} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Remarks…" />
        </div>
      </div>
      {err && <div style={{ color: "#dc2626", fontSize: "0.78rem", marginBottom: "0.4rem" }}>{err}</div>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={submit} disabled={pending} style={BTN_SM("#16a34a")}>{pending ? "Saving…" : "Add Vendor Price"}</button>
        <button onClick={() => setOpen(false)} style={BTN_SM("#6b7280")}>Cancel</button>
      </div>
    </div>
  );
}

export default function MaterialVendors({ materialId, rows, allSuppliers }: { materialId: string; rows: VendorRow[]; allSuppliers: SupplierOption[] }) {
  const existingSupplierIds = new Set(rows.map(r => r.supplierId));

  // Determine best price vendor (lowest unit price among rows that have a price)
  const priced = rows.filter(r => r.unitPrice != null && Number(r.unitPrice) > 0);
  const bestPrice = priced.length > 0 ? Math.min(...priced.map(r => Number(r.unitPrice))) : null;
  const bestId = bestPrice != null ? priced.find(r => Number(r.unitPrice) === bestPrice)?.id : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div>
          <h2 style={{ margin: "0 0 0.2rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
            Vendor Price List ({rows.length} vendors)
          </h2>
          {bestPrice != null && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>
              Best price suggestion based on lowest unit price — <strong style={{ color: "#166534" }}>PHP {bestPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
            </p>
          )}
        </div>
        <AddVendorPriceForm materialId={materialId} suppliers={allSuppliers} existingSupplierIds={existingSupplierIds} />
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
          No vendor prices recorded yet. Add vendors via the "+ Add Vendor Price" button or from each vendor's Price List page.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Vendor / Supplier", "Unit Price", "UOM", "Effective Date", "Notes", ""].map((h, i) => (
                  <th key={i} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => Number(a.unitPrice ?? 9e9) - Number(b.unitPrice ?? 9e9)).map(row => (
                <VendorEntry key={row.id} row={row} materialId={materialId} isBest={row.id === bestId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
