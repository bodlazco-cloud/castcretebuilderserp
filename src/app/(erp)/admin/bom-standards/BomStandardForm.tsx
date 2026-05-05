"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBomStandard, updateBomStandard, toggleBomStandardActive, deleteBomStandard } from "@/actions/master-list";

const inp: React.CSSProperties = { display: "block", width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" };

const UNIT_TYPES = ["BEG", "REG", "END"] as const;

type ActivityOpt = { id: string; activityCode: string; activityName: string };
type MaterialOpt = { id: string; code: string; name: string; unit: string };

type Initial = {
  id: string;
  activityDefId: string;
  unitModel: string;
  unitType: string;
  materialId: string;
  quantityPerUnit: string;
  baseRatePhp?: string;
  isActive: boolean;
};

export function BomStandardForm({
  mode, initial, activities, materials,
}: {
  mode: "create" | "edit";
  initial?: Initial;
  activities: ActivityOpt[];
  materials: MaterialOpt[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [activityDefId, setActivityDefId] = useState(initial?.activityDefId ?? "");
  const [unitModel,     setUnitModel]     = useState(initial?.unitModel ?? "");
  const [unitType,      setUnitType]      = useState(initial?.unitType ?? "SINGLE");
  const [materialId,    setMaterialId]    = useState(initial?.materialId ?? "");
  const [qty,           setQty]           = useState(initial?.quantityPerUnit ?? "");
  const [baseRate,      setBaseRate]      = useState(initial?.baseRatePhp ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      activityDefId,
      unitModel,
      unitType: unitType as typeof UNIT_TYPES[number],
      materialId,
      quantityPerUnit: Number(qty),
      baseRatePhp: baseRate ? Number(baseRate) : undefined,
    };
    startTransition(async () => {
      const result = mode === "create"
        ? await createBomStandard(input)
        : await updateBomStandard(initial!.id, input);
      if (result.success) router.push("/admin/bom-standards");
      else setError(result.error);
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteBomStandard(initial!.id);
      if (result.success) router.push("/admin/bom-standards");
      else setError(result.error ?? "Delete failed.");
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <div style={{ padding: "0.6rem 0.85rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem" }}>{error}</div>}

      <label><span style={lbl}>Activity Definition *</span>
        <select required value={activityDefId} onChange={(e) => setActivityDefId(e.target.value)} style={inp}>
          <option value="">— Select activity —</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>{a.activityCode}: {a.activityName}</option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label><span style={lbl}>Unit Model *</span>
          <input required value={unitModel} onChange={(e) => setUnitModel(e.target.value)} style={inp} placeholder="e.g. Standard, Duplex A" />
        </label>
        <label><span style={lbl}>Unit Type *</span>
          <select required value={unitType} onChange={(e) => setUnitType(e.target.value)} style={inp}>
            {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      <label><span style={lbl}>Material *</span>
        <select required value={materialId} onChange={(e) => setMaterialId(e.target.value)} style={inp}>
          <option value="">— Select material —</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.code}: {m.name} ({m.unit})</option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label><span style={lbl}>Quantity per Unit *</span>
          <input type="number" required min={0.0001} step={0.0001} value={qty} onChange={(e) => setQty(e.target.value)} style={inp} />
        </label>
        <label><span style={lbl}>Base Rate (PHP) — optional</span>
          <input type="number" min={0} step={0.01} value={baseRate} onChange={(e) => setBaseRate(e.target.value)} style={inp} placeholder="Falls back to material admin price" />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", paddingTop: "0.25rem" }}>
        <button type="submit" disabled={isPending} style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: isPending ? "#a5b4fc" : "#dc2626", color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}>
          {isPending ? "Saving…" : mode === "create" ? "Create BOM Line" : "Save Changes"}
        </button>
        {mode === "edit" && (
          <button type="button" onClick={() => startTransition(async () => { await toggleBomStandardActive(initial!.id, !initial!.isActive); router.refresh(); })} disabled={isPending} style={{ padding: "0.6rem 1rem", borderRadius: "6px", background: initial?.isActive ? "#fef2f2" : "#f0fdf4", color: initial?.isActive ? "#b91c1c" : "#166534", border: `1px solid ${initial?.isActive ? "#fecaca" : "#86efac"}`, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}>
            {initial?.isActive ? "Deactivate" : "Reactivate"}
          </button>
        )}
        <a href="/admin/bom-standards" style={{ padding: "0.6rem 1rem", borderRadius: "6px", background: "#f3f4f6", color: "#374151", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>Cancel</a>
      </div>

      {mode === "edit" && (
        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
          <div style={{ fontWeight: 700, color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Danger Zone</div>
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#dc2626", color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
              Delete BOM Line
            </button>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "#b91c1c" }}>Are you sure?</span>
              <button type="button" onClick={handleDelete} disabled={isDeleting} style={{ padding: "0.4rem 0.85rem", borderRadius: "6px", background: "#dc2626", color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                {isDeleting ? "Deleting…" : "Yes, Delete"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} style={{ padding: "0.4rem 0.85rem", borderRadius: "6px", background: "#f3f4f6", color: "#374151", border: "none", fontSize: "0.8rem", cursor: "pointer" }}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
