"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDraftBomEntry } from "@/actions/planning";

type Material      = { id: string; code: string; name: string; unit: string; adminPrice: string | null; preferredSupplierId: string | null };
type Vendor        = { id: string; name: string };
type PhaseScope    = { id: string; code: string; name: string; categoryId: string };
type PhaseActivity = { id: string; scopeId: string; code: string; name: string };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

const UNIT_TYPES = [
  { value: "BEG",  label: "BEG — Beginning Unit" },
  { value: "MID",  label: "MID — Middle Unit" },
  { value: "END",  label: "END — End Unit" },
  { value: "SHOP", label: "SHOP — Shop / Retail Unit" },
];

export function BomLineEditForm({
  id,
  isAdminEdit = false,
  initialScopeId,
  initialActivityId,
  initialUnitModel,
  initialUnitType,
  initialMaterialId,
  initialQty,
  initialEquipmentType,
  phaseScopes,
  phaseActivities,
  unitModels,
  materials,
  vendors,
}: {
  id:                   string;
  isAdminEdit?:         boolean;
  initialScopeId:       string;
  initialActivityId:    string;
  initialUnitModel:     string;
  initialUnitType:      string;
  initialMaterialId:    string;
  initialQty:           string;
  initialEquipmentType: string;
  phaseScopes:          PhaseScope[];
  phaseActivities:      PhaseActivity[];
  unitModels:           string[];
  materials:            Material[];
  vendors:              Vendor[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error,   setError]   = useState<string | null>(null);

  const [scopeId,        setScopeId]        = useState(initialScopeId);
  const [activityId,     setActivityId]     = useState(initialActivityId);
  const [unitModel,      setUnitModel]      = useState(initialUnitModel);
  const [unitType,       setUnitType]       = useState(initialUnitType);
  const [materialId,     setMaterialId]     = useState(initialMaterialId);
  const [qty,            setQty]            = useState(initialQty);
  const [unitPrice,      setUnitPrice]      = useState(() => {
    const mat = materials.find((m) => m.id === initialMaterialId);
    return mat?.adminPrice ?? "";
  });
  const [equipmentType,  setEquipmentType]  = useState(initialEquipmentType);

  const scopeActivities = phaseActivities.filter((a) => a.scopeId === scopeId);

  const lineTotal = (() => {
    const q = parseFloat(qty);
    const p = parseFloat(unitPrice);
    if (!isNaN(q) && !isNaN(p)) return (q * p).toLocaleString("en-PH", { minimumFractionDigits: 2 });
    return "—";
  })();

  function handleScopeChange(id: string) {
    setScopeId(id);
    // Reset activity if it no longer belongs to the selected scope
    if (!phaseActivities.some((a) => a.id === activityId && a.scopeId === id)) setActivityId("");
  }

  function handleMaterialChange(matId: string) {
    setMaterialId(matId);
    const mat = materials.find((m) => m.id === matId);
    setUnitPrice(mat?.adminPrice ?? "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!scopeId || !unitModel || !unitType || !materialId || !qty) {
      setError("Scope, unit model, unit type, material, and quantity are required.");
      return;
    }

    startTransition(async () => {
      const result = await updateDraftBomEntry({
        id,
        phaseScopeId:    scopeId,
        phaseActivityId: activityId || undefined,
        unitModel,
        unitType:        unitType as "BEG" | "MID" | "END" | "SHOP",
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

      {/* Scope + Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Scope of Work *</span>
          <select required style={inputStyle} value={scopeId} onChange={(e) => handleScopeChange(e.target.value)}>
            <option value="">Select scope…</option>
            {phaseScopes.map((s) => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Activity <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></span>
          <select style={inputStyle} value={activityId} onChange={(e) => setActivityId(e.target.value)} disabled={!scopeId}>
            <option value="">Select activity…</option>
            {scopeActivities.map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Unit Model + Unit Type */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Unit Model *</span>
          <input
            list="bom-edit-unit-models" required maxLength={50}
            style={inputStyle} value={unitModel}
            onChange={(e) => setUnitModel(e.target.value)}
            placeholder="e.g. Modena 32"
          />
          <datalist id="bom-edit-unit-models">
            {unitModels.map((m) => <option key={m} value={m} />)}
          </datalist>
        </label>
        <label>
          <span style={labelStyle}>Unit Type *</span>
          <select required style={inputStyle} value={unitType} onChange={(e) => setUnitType(e.target.value)}>
            <option value="">Select unit type…</option>
            {UNIT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
      </div>

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
          {isPending ? "Saving…" : (isAdminEdit ? "Save Correction" : "Save & Resubmit for Approval")}
        </button>
      </div>
    </form>
  );
}
