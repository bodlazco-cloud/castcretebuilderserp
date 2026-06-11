"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMaterial } from "@/actions/master-list";

type Material = {
  id: string; name: string; unit: string; category: string | null;
  adminPrice: string; minimumQuantity: string | null;
  supId: string | null;
};
type Supplier = { id: string; name: string };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.55rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

export function EditMaterialForm({ material, suppliers }: { material: Material; suppliers: Supplier[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const minQty = fd.get("minimumQuantity") as string;
    startTransition(async () => {
      const result = await updateMaterial({
        id:                  material.id,
        name:                fd.get("name") as string,
        unit:                fd.get("unit") as string,
        category:            (fd.get("category") as string) || undefined,
        adminPrice:          Number(fd.get("adminPrice")),
        minimumQuantity:     minQty ? Number(minQty) : undefined,
        preferredSupplierId: (fd.get("preferredSupplierId") as string) || undefined,
      });
      if (result.success) { setOpen(false); router.refresh(); }
      else setError(result.error ?? "Error saving.");
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "0.5rem 1rem", borderRadius: "6px",
          background: open ? "#f3f4f6" : "#374151",
          color: open ? "#374151" : "#fff",
          border: open ? "1px solid #d1d5db" : "none",
          fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
        }}
      >
        {open ? "Cancel" : "Edit Material"}
      </button>

      {open && (
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginTop: "1rem" }}>
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Edit Material</h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
              <label>
                <span style={labelStyle}>Material Name *</span>
                <input name="name" required defaultValue={material.name} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Unit *</span>
                <input name="unit" required defaultValue={material.unit} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Category</span>
                <input name="category" defaultValue={material.category ?? ""} style={inputStyle} />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label>
                <span style={labelStyle}>Admin Price (PHP) *</span>
                <input name="adminPrice" type="number" min="0" step="0.01" required defaultValue={material.adminPrice} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Minimum Quantity</span>
                <input name="minimumQuantity" type="number" min="0" step="0.0001" defaultValue={material.minimumQuantity ?? ""} style={inputStyle} />
              </label>
            </div>
            <label>
              <span style={labelStyle}>Preferred Supplier</span>
              <select name="preferredSupplierId" defaultValue={material.supId ?? ""} style={inputStyle}>
                <option value="">— None —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            {error && (
              <div style={{ padding: "0.65rem 0.9rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem" }}>{error}</div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={isPending} style={{
                padding: "0.55rem 1.5rem", borderRadius: "6px", background: isPending ? "#9ca3af" : "#374151",
                color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
              }}>
                {isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
