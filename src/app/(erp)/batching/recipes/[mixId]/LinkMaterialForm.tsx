"use client";

import { useState, useTransition } from "react";
import { linkMaterialToMixDesign, unlinkMaterialFromMixDesign } from "@/actions/batching-bom";

const ACCENT = "#1a56db";

interface Material { id: string; code: string; name: string; unit: string }

interface Props {
  mixId: string;
  linkedMaterial: { materialId: string; materialName: string; materialCode: string } | null;
  allMaterials: Material[];
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.45rem 0.6rem", border: "1px solid #d1d5db",
  borderRadius: "6px", fontSize: "0.82rem", boxSizing: "border-box",
};

export function LinkMaterialForm({ mixId, linkedMaterial, allMaterials }: Props) {
  const [isPending, startTransition] = useTransition();
  const [linked, setLinked] = useState(linkedMaterial);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  function handleLink() {
    if (!selectedId) return;
    startTransition(async () => {
      setError(null);
      const mat = allMaterials.find((m) => m.id === selectedId);
      const res = await linkMaterialToMixDesign(selectedId, mixId);
      if (res.success) {
        setLinked({ materialId: selectedId, materialName: mat?.name ?? "—", materialCode: mat?.code ?? "" });
        setShowPicker(false);
        setSelectedId("");
      } else {
        setError(res.error ?? "Failed to link.");
      }
    });
  }

  function handleUnlink() {
    if (!linked) return;
    startTransition(async () => {
      setError(null);
      const res = await unlinkMaterialFromMixDesign(linked.materialId, mixId);
      if (res.success) setLinked(null);
      else setError(res.error ?? "Failed to unlink.");
    });
  }

  return (
    <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: linked || showPicker ? "0.85rem" : 0 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#111827" }}>
            Planning BOM Material Link
          </h3>
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
            Link this mix design to the master material used in Planning BOMs (e.g. "Premix Concrete G3000").
            When that material appears in a BOM, the system generates an IPO to this Batching Plant recipe.
          </p>
        </div>
        {!linked && !showPicker && (
          <button
            onClick={() => setShowPicker(true)}
            style={{
              padding: "0.4rem 0.85rem", background: ACCENT, color: "#fff",
              border: "none", borderRadius: "6px", fontSize: "0.78rem",
              fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            + Link Material
          </button>
        )}
      </div>

      {linked && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.85rem", background: "#eff6ff", borderRadius: "7px", border: "1px solid #bfdbfe" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.8rem", color: ACCENT }}>{linked.materialCode}</div>
            <div style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 500 }}>{linked.materialName}</div>
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.1rem" }}>
              Planning BOMs referencing this material will auto-generate an IPO to this recipe.
            </div>
          </div>
          <button
            disabled={isPending}
            onClick={handleUnlink}
            style={{
              padding: "0.3rem 0.6rem", background: "transparent",
              border: "1px solid #fca5a5", borderRadius: "5px",
              color: "#dc2626", fontSize: "0.72rem", cursor: "pointer",
            }}
          >
            Unlink
          </button>
        </div>
      )}

      {showPicker && (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: "0.2rem" }}>Select Premix Material</div>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={inputStyle}>
              <option value="">Choose master material…</option>
              {allMaterials.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.code}) — {m.unit}</option>
              ))}
            </select>
          </div>
          <button
            disabled={isPending || !selectedId}
            onClick={handleLink}
            style={{
              padding: "0.45rem 0.9rem", background: ACCENT, color: "#fff",
              border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600,
              cursor: isPending || !selectedId ? "not-allowed" : "pointer",
              opacity: isPending || !selectedId ? 0.6 : 1,
            }}
          >
            {isPending ? "Linking…" : "Confirm Link"}
          </button>
          <button
            onClick={() => { setShowPicker(false); setSelectedId(""); }}
            style={{
              padding: "0.45rem 0.75rem", background: "transparent",
              border: "1px solid #d1d5db", borderRadius: "6px",
              fontSize: "0.8rem", cursor: "pointer", color: "#6b7280",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {error && <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#dc2626" }}>{error}</div>}
    </div>
  );
}
