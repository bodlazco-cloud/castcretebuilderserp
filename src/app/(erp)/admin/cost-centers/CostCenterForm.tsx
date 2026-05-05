"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCostCenter, updateCostCenter, toggleCostCenterActive, deleteCostCenter } from "@/actions/master-list";

const inp: React.CSSProperties = { display: "block", width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" };

type DeptOpt = { id: string; code: string; name: string };

type Initial = {
  id: string;
  code: string;
  name: string;
  deptId: string;
  type: "PROJECT" | "BATCHING" | "FLEET" | "HQ";
  isActive: boolean;
};

export function CostCenterForm({ mode, initial, departments }: { mode: "create" | "edit"; initial?: Initial; departments: DeptOpt[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [code,   setCode]   = useState(initial?.code ?? "");
  const [name,   setName]   = useState(initial?.name ?? "");
  const [deptId, setDeptId] = useState(initial?.deptId ?? "");
  const [type,   setType]   = useState<"PROJECT" | "BATCHING" | "FLEET" | "HQ">(initial?.type ?? "HQ");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = mode === "create"
        ? await createCostCenter({ code, name, deptId, type })
        : await updateCostCenter(initial!.id, { code, name, deptId, type });
      if (result.success) router.push("/admin/cost-centers");
      else setError(result.error);
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteCostCenter(initial!.id);
      if (result.success) router.push("/admin/cost-centers");
      else setError(result.error ?? "Delete failed.");
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <div style={{ padding: "0.6rem 0.85rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
        <label><span style={lbl}>Code *</span>
          <input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} style={inp} placeholder="CC-01" />
        </label>
        <label><span style={lbl}>Name *</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder="Project — Palayan" />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label><span style={lbl}>Department *</span>
          <select required value={deptId} onChange={(e) => setDeptId(e.target.value)} style={inp}>
            <option value="">— Select department —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
          </select>
        </label>
        <label><span style={lbl}>Type *</span>
          <select required value={type} onChange={(e) => setType(e.target.value as typeof type)} style={inp}>
            <option value="PROJECT">PROJECT</option>
            <option value="BATCHING">BATCHING</option>
            <option value="FLEET">FLEET</option>
            <option value="HQ">HQ</option>
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", paddingTop: "0.25rem" }}>
        <button type="submit" disabled={isPending} style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: isPending ? "#a5b4fc" : "#dc2626", color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}>
          {isPending ? "Saving…" : mode === "create" ? "Create Cost Center" : "Save Changes"}
        </button>
        {mode === "edit" && (
          <button type="button" onClick={() => startTransition(async () => { await toggleCostCenterActive(initial!.id, !initial!.isActive); router.refresh(); })} disabled={isPending} style={{ padding: "0.6rem 1rem", borderRadius: "6px", background: initial?.isActive ? "#fef2f2" : "#f0fdf4", color: initial?.isActive ? "#b91c1c" : "#166534", border: `1px solid ${initial?.isActive ? "#fecaca" : "#86efac"}`, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}>
            {initial?.isActive ? "Deactivate" : "Reactivate"}
          </button>
        )}
        <a href="/admin/cost-centers" style={{ padding: "0.6rem 1rem", borderRadius: "6px", background: "#f3f4f6", color: "#374151", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>Cancel</a>
      </div>

      {mode === "edit" && (
        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
          <div style={{ fontWeight: 700, color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Danger Zone</div>
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#dc2626", color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>Delete Cost Center</button>
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
