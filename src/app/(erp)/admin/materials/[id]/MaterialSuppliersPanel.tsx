"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMaterialSupplier, removeMaterialSupplier } from "@/actions/master-list";

type LinkedSupplier = { id: string; supplierId: string; supplierName: string; isPreferred: boolean };
type Supplier = { id: string; name: string };

export function MaterialSuppliersPanel({
  materialId, linked, allSuppliers,
}: {
  materialId: string;
  linked: LinkedSupplier[];
  allSuppliers: Supplier[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addSupplierId, setAddSupplierId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const linkedIds = new Set(linked.map((l) => l.supplierId));
  const available = allSuppliers.filter((s) => !linkedIds.has(s.id));

  function handleAdd() {
    if (!addSupplierId) return;
    setError(null);
    startTransition(async () => {
      const result = await setMaterialSupplier(materialId, addSupplierId, false);
      if (result.success) { setAddSupplierId(""); router.refresh(); }
      else setError(result.error ?? "Failed.");
    });
  }

  function handleSetPreferred(supplierId: string) {
    startTransition(async () => {
      await setMaterialSupplier(materialId, supplierId, true);
      router.refresh();
    });
  }

  function handleRemove(linkId: string) {
    startTransition(async () => {
      await removeMaterialSupplier(linkId, materialId);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {error && <div style={{ color: "#b91c1c", fontSize: "0.8rem" }}>{error}</div>}

      {linked.length === 0 ? (
        <div style={{ padding: "0.75rem", background: "#f9fafb", borderRadius: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>
          No suppliers linked yet.
        </div>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
          {linked.map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.9rem", borderBottom: "1px solid #f3f4f6", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.875rem" }}>{l.supplierName}</span>
                {l.isPreferred && (
                  <span style={{ padding: "0.15rem 0.45rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, background: "#dcfce7", color: "#166534" }}>
                    PREFERRED
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {!l.isPreferred && (
                  <button
                    type="button"
                    onClick={() => handleSetPreferred(l.supplierId)}
                    disabled={isPending}
                    style={{ padding: "0.3rem 0.65rem", borderRadius: "4px", background: "#f0fdf4", color: "#057a55", border: "1px solid #86efac", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    Set Preferred
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(l.id)}
                  disabled={isPending}
                  style={{ padding: "0.3rem 0.65rem", borderRadius: "4px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", fontSize: "0.75rem", cursor: "pointer" }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            value={addSupplierId}
            onChange={(e) => setAddSupplierId(e.target.value)}
            style={{ flex: 1, padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}
          >
            <option value="">— Select supplier to add —</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !addSupplierId}
            style={{ padding: "0.5rem 0.9rem", borderRadius: "6px", background: "#dc2626", color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: addSupplierId ? "pointer" : "not-allowed", opacity: addSupplierId ? 1 : 0.6 }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
