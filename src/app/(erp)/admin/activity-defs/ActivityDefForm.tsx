"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createActivityDefinition, updateActivityDefinition, toggleActivityDefinitionActive, deleteActivityDefinition } from "@/actions/master-list";

const inp: React.CSSProperties = { display: "block", width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem" };

type Initial = {
  id: string;
  category: "STRUCTURAL" | "ARCHITECTURAL" | "TURNOVER";
  scopeCode: string; scopeName: string;
  activityCode: string; activityName: string;
  standardDurationDays: number;
  weightInScopePct: number;
  sequenceOrder: number;
  isActive: boolean;
};

export function ActivityDefForm({ mode, initial }: { mode: "create" | "edit"; initial?: Initial }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const [category,             setCategory]   = useState<"STRUCTURAL" | "ARCHITECTURAL" | "TURNOVER">(initial?.category ?? "STRUCTURAL");
  const [scopeCode,            setScopeCode]  = useState(initial?.scopeCode ?? "");
  const [scopeName,            setScopeName]  = useState(initial?.scopeName ?? "");
  const [activityCode,         setActCode]    = useState(initial?.activityCode ?? "");
  const [activityName,         setActName]    = useState(initial?.activityName ?? "");
  const [standardDurationDays, setDuration]   = useState(String(initial?.standardDurationDays ?? "1"));
  const [weightInScopePct,     setWeight]     = useState(String(initial?.weightInScopePct ?? "0"));
  const [sequenceOrder,        setSeq]        = useState(String(initial?.sequenceOrder ?? "1"));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      category,
      scopeCode, scopeName,
      activityCode, activityName,
      standardDurationDays: Number(standardDurationDays),
      weightInScopePct: Number(weightInScopePct),
      sequenceOrder: Number(sequenceOrder),
    };
    startTransition(async () => {
      const result = mode === "create"
        ? await createActivityDefinition(input)
        : await updateActivityDefinition(initial!.id, input);
      if (result.success) {
        router.push("/admin/activity-defs");
      } else {
        setError(result.error);
      }
    });
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleActivityDefinitionActive(initial!.id, !initial!.isActive);
      router.refresh();
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteActivityDefinition(initial!.id);
      if (result.success) {
        router.push("/admin/activity-defs");
      } else {
        setError(result.error ?? "Delete failed.");
        setConfirmDelete(false);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && <div style={{ padding: "0.6rem 0.85rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.8rem" }}>{error}</div>}

      <label>
        <span style={lbl}>Category *</span>
        <select required value={category} onChange={(e) => setCategory(e.target.value as typeof category)} style={inp}>
          <option value="STRUCTURAL">STRUCTURAL</option>
          <option value="ARCHITECTURAL">ARCHITECTURAL</option>
          <option value="TURNOVER">TURNOVER</option>
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
        <label><span style={lbl}>Scope Code *</span>
          <input required value={scopeCode} onChange={(e) => setScopeCode(e.target.value)} style={inp} placeholder="SC-01" />
        </label>
        <label><span style={lbl}>Scope Name *</span>
          <input required value={scopeName} onChange={(e) => setScopeName(e.target.value)} style={inp} placeholder="Structural Works" />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
        <label><span style={lbl}>Activity Code *</span>
          <input required value={activityCode} onChange={(e) => setActCode(e.target.value)} style={inp} placeholder="ACT-001" />
        </label>
        <label><span style={lbl}>Activity Name *</span>
          <input required value={activityName} onChange={(e) => setActName(e.target.value)} style={inp} placeholder="Foundation Works" />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
        <label><span style={lbl}>Std. Duration (days) *</span>
          <input type="number" required min={1} value={standardDurationDays} onChange={(e) => setDuration(e.target.value)} style={inp} />
        </label>
        <label><span style={lbl}>Weight in Scope %</span>
          <input type="number" min={0} max={100} step={0.01} value={weightInScopePct} onChange={(e) => setWeight(e.target.value)} style={inp} />
        </label>
        <label><span style={lbl}>Sequence Order *</span>
          <input type="number" required min={1} value={sequenceOrder} onChange={(e) => setSeq(e.target.value)} style={inp} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", paddingTop: "0.25rem" }}>
        <button type="submit" disabled={isPending} style={{
          padding: "0.6rem 1.25rem", borderRadius: "6px",
          background: isPending ? "#a5b4fc" : "#dc2626",
          color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : mode === "create" ? "Create Activity" : "Save Changes"}
        </button>

        {mode === "edit" && (
          <button type="button" onClick={handleToggle} disabled={isPending} style={{
            padding: "0.6rem 1rem", borderRadius: "6px",
            background: initial?.isActive ? "#fef2f2" : "#f0fdf4",
            color: initial?.isActive ? "#b91c1c" : "#166534",
            border: `1px solid ${initial?.isActive ? "#fecaca" : "#86efac"}`,
            fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
          }}>
            {initial?.isActive ? "Deactivate" : "Reactivate"}
          </button>
        )}

        <a href="/admin/activity-defs" style={{
          padding: "0.6rem 1rem", borderRadius: "6px", background: "#f3f4f6",
          color: "#374151", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600,
        }}>Cancel</a>
      </div>

      {mode === "edit" && (
        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
          <div style={{ fontWeight: 700, color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Danger Zone</div>
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#dc2626", color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
              Delete Activity Definition
            </button>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", color: "#b91c1c" }}>Are you sure?</span>
              <button type="button" onClick={handleDelete} disabled={isDeleting} style={{ padding: "0.4rem 0.85rem", borderRadius: "6px", background: "#dc2626", color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                {isDeleting ? "Deleting…" : "Yes, Delete"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} style={{ padding: "0.4rem 0.85rem", borderRadius: "6px", background: "#f3f4f6", color: "#374151", border: "none", fontSize: "0.8rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
