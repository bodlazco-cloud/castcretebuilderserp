"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVendorPriceEntry, updateVendorPriceEntry, deleteVendorPriceEntry, deleteVendorPriceHistoryEntry } from "@/actions/master-list";

type MaterialOption = { id: string; code: string; name: string; unit: string };

type PriceRow = {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unitPrice: string | null;
  uom: string | null;
  minimumQuantity: string | null;
  effectiveDate: string | null;
  notes: string | null;
};

type HistoryRow = {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unitPrice: string | null;
  uom: string | null;
  minimumQuantity: string | null;
  effectiveDate: string | null;
  notes: string | null;
  supersededAt: string;
};

const TH: React.CSSProperties = { padding: "0.6rem 0.9rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", fontSize: "0.8rem", whiteSpace: "nowrap" };
const TD: React.CSSProperties = { padding: "0.55rem 0.9rem", fontSize: "0.85rem", color: "#374151", verticalAlign: "middle" };
const INPUT: React.CSSProperties = { width: "100%", padding: "0.35rem 0.5rem", border: "1px solid #d1d5db", borderRadius: "5px", fontSize: "0.82rem", color: "#111827", background: "#fff" };
const BTN_SM = (color: string): React.CSSProperties => ({ padding: "0.25rem 0.6rem", fontSize: "0.75rem", fontWeight: 600, border: "none", borderRadius: "5px", cursor: "pointer", background: color, color: "#fff" });

function fmt(v: string | null) {
  if (!v) return "—";
  return `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EditRow({ row, vendorId, onDone }: { row: PriceRow; vendorId: string; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [price, setPrice] = useState(row.unitPrice ?? "");
  const [uom, setUom] = useState(row.uom ?? "");
  const [minQty, setMinQty] = useState(row.minimumQuantity ?? "");
  const [date, setDate] = useState(row.effectiveDate ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [err, setErr] = useState("");

  function save() {
    const p = parseFloat(price);
    if (!p || p <= 0) { setErr("Price required"); return; }
    startTransition(async () => {
      const res = await updateVendorPriceEntry(row.id, vendorId, row.materialId, {
        unitPrice: p,
        uom: uom || undefined,
        minimumQuantity: minQty ? parseFloat(minQty) : undefined,
        effectiveDate: date || undefined,
        notes: notes || undefined,
      });
      if (res.success) { router.refresh(); onDone(); }
      else setErr(res.error ?? "Error");
    });
  }

  return (
    <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
      <td style={TD}><span style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{row.materialCode}</span><br /><span style={{ color: "#111827", fontWeight: 500 }}>{row.materialName}</span></td>
      <td style={TD}><input style={{ ...INPUT, width: "110px" }} type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" /></td>
      <td style={TD}><input style={{ ...INPUT, width: "80px" }} value={uom} onChange={e => setUom(e.target.value)} placeholder="bag" /></td>
      <td style={TD}><input style={{ ...INPUT, width: "90px" }} type="number" step="0.0001" value={minQty} onChange={e => setMinQty(e.target.value)} placeholder="0" /></td>
      <td style={TD}><input style={{ ...INPUT, width: "130px" }} type="date" value={date} onChange={e => setDate(e.target.value)} /></td>
      <td style={TD}><input style={{ ...INPUT, width: "160px" }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Remarks…" /></td>
      <td style={{ ...TD, whiteSpace: "nowrap" }}>
        {err && <div style={{ color: "#dc2626", fontSize: "0.72rem", marginBottom: "0.25rem" }}>{err}</div>}
        <button onClick={save} disabled={pending} style={BTN_SM("#16a34a")}>{pending ? "Saving…" : "Save"}</button>
        {" "}
        <button onClick={onDone} style={BTN_SM("#6b7280")}>Cancel</button>
      </td>
    </tr>
  );
}

function PriceRowView({ row, vendorId, onEdit }: { row: PriceRow; vendorId: string; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function del() {
    startTransition(async () => {
      await deleteVendorPriceEntry(row.id, vendorId, row.materialId);
      router.refresh();
    });
  }

  return (
    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
      <td style={TD}>
        <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6b7280" }}>{row.materialCode}</span><br />
        <span style={{ color: "#111827", fontWeight: 500 }}>{row.materialName}</span>
      </td>
      <td style={{ ...TD, fontWeight: 600, color: "#111827" }}>{fmt(row.unitPrice)}</td>
      <td style={{ ...TD, color: "#6b7280" }}>{row.uom ?? "—"}</td>
      <td style={{ ...TD, color: "#6b7280" }}>{row.minimumQuantity ? Number(row.minimumQuantity).toLocaleString("en-PH", { maximumFractionDigits: 4 }) : "—"}</td>
      <td style={{ ...TD, color: "#6b7280" }}>{row.effectiveDate ?? "—"}</td>
      <td style={{ ...TD, color: "#6b7280", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.notes ?? "—"}</td>
      <td style={{ ...TD, whiteSpace: "nowrap" }}>
        <button onClick={onEdit} style={BTN_SM("#6366f1")}>Edit</button>
        {" "}
        {confirm
          ? <><button onClick={del} disabled={pending} style={BTN_SM("#dc2626")}>{pending ? "…" : "Confirm"}</button>{" "}<button onClick={() => setConfirm(false)} style={BTN_SM("#6b7280")}>Cancel</button></>
          : <button onClick={() => setConfirm(true)} style={BTN_SM("#ef4444")}>Delete</button>
        }
      </td>
    </tr>
  );
}

function AddPriceForm({ vendorId, materials }: { vendorId: string; materials: MaterialOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [matId, setMatId] = useState("");
  const [price, setPrice] = useState("");
  const [uom, setUom] = useState("");
  const [minQty, setMinQty] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  function submit() {
    setErr("");
    if (!matId) { setErr("Select a material"); return; }
    const p = parseFloat(price);
    if (!p || p <= 0) { setErr("Enter a valid price"); return; }
    startTransition(async () => {
      const res = await addVendorPriceEntry(vendorId, {
        materialId: matId, unitPrice: p,
        uom: uom || undefined,
        minimumQuantity: minQty ? parseFloat(minQty) : undefined,
        effectiveDate: date || undefined,
        notes: notes || undefined,
      });
      if (res.success) { router.refresh(); setOpen(false); setMatId(""); setPrice(""); setUom(""); setMinQty(""); setDate(""); setNotes(""); }
      else setErr(res.error ?? "Error");
    });
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ padding: "0.45rem 1rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
      + Add / Update Price
    </button>
  );

  return (
    <div style={{ background: "#f8f9ff", border: "1px solid #e0e7ff", borderRadius: "8px", padding: "1rem", marginTop: "0.75rem" }}>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "#6b7280" }}>
        Adding a price for a material already in the list will archive the old entry to Price History.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 2fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <div>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "0.2rem" }}>Material *</label>
          <select value={matId} onChange={e => setMatId(e.target.value)} style={{ ...INPUT }}>
            <option value="">Select material…</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
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
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "0.2rem" }}>Min. Quantity</label>
          <input style={INPUT} type="number" step="0.0001" value={minQty} onChange={e => setMinQty(e.target.value)} placeholder="0" />
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
        <button onClick={submit} disabled={pending} style={BTN_SM("#16a34a")}>{pending ? "Saving…" : "Add to Price List"}</button>
        <button onClick={() => setOpen(false)} style={BTN_SM("#6b7280")}>Cancel</button>
      </div>
    </div>
  );
}

function HistorySection({ rows, vendorId }: { rows: HistoryRow[]; vendorId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function del(id: string, materialId: string) {
    startTransition(async () => {
      await deleteVendorPriceHistoryEntry(id, vendorId, materialId);
      router.refresh();
    });
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", padding: 0, color: "#6b7280", fontSize: "0.85rem", fontWeight: 600 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Price History ({rows.length} archived {rows.length === 1 ? "entry" : "entries"})
      </button>

      {open && (
        <div style={{ marginTop: "0.75rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden", opacity: 0.85 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Material", "Unit Price", "UOM", "Min. Qty", "Effective Date", "Superseded On", "Notes", ""].map((h, i) => (
                  <th key={i} style={{ ...TH, color: "#9ca3af" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ ...TD, color: "#6b7280" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{row.materialCode}</span><br />
                    <span>{row.materialName}</span>
                  </td>
                  <td style={{ ...TD, color: "#6b7280" }}>{fmt(row.unitPrice)}</td>
                  <td style={{ ...TD, color: "#9ca3af" }}>{row.uom ?? "—"}</td>
                  <td style={{ ...TD, color: "#9ca3af" }}>{row.minimumQuantity ? Number(row.minimumQuantity).toLocaleString("en-PH", { maximumFractionDigits: 4 }) : "—"}</td>
                  <td style={{ ...TD, color: "#9ca3af" }}>{row.effectiveDate ?? "—"}</td>
                  <td style={{ ...TD, color: "#9ca3af" }}>{new Date(row.supersededAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</td>
                  <td style={{ ...TD, color: "#9ca3af", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.notes ?? "—"}</td>
                  <td style={{ ...TD, whiteSpace: "nowrap" }}>
                    <button onClick={() => del(row.id, row.materialId)} disabled={pending} style={BTN_SM("#ef4444")}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function VendorPriceList({ vendorId, rows, historyRows, allMaterials }: { vendorId: string; rows: PriceRow[]; historyRows: HistoryRow[]; allMaterials: MaterialOption[] }) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#374151" }}>Price List Roster ({rows.length} materials)</h2>
        <AddPriceForm vendorId={vendorId} materials={allMaterials} />
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
          No materials on this vendor's price list yet. Click "+ Add / Update Price" to start.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Material", "Unit Price", "UOM", "Min. Qty", "Effective Date", "Notes", ""].map((h, i) => (
                  <th key={i} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row =>
                editing === row.id
                  ? <EditRow key={row.id} row={row} vendorId={vendorId} onDone={() => setEditing(null)} />
                  : <PriceRowView key={row.id} row={row} vendorId={vendorId} onEdit={() => setEditing(row.id)} />
              )}
            </tbody>
          </table>
        </div>
      )}

      {historyRows.length > 0 && <HistorySection rows={historyRows} vendorId={vendorId} />}
    </div>
  );
}
