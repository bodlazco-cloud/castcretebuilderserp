"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBomForReview, reviewMasterBom, withdrawBomSubmission, addMasterBomLine, deleteDraftBomEntry } from "@/actions/planning";

type Material = { id: string; code: string; name: string; unit: string; adminPrice: string | null };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.4rem 0.6rem",
  border: "1px solid #d1d5db", borderRadius: "5px", fontSize: "0.78rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.2rem",
};

// ── Add a Material line to a BOM group ────────────────────────────────────────

export function BomAddMaterialAction({
  projectId, phaseScopeId, phaseActivityId, activityDefId, unitModel, unitType, materials,
}: {
  projectId:        string;
  phaseScopeId:     string;
  phaseActivityId:  string | null;
  activityDefId:    string | null;
  unitModel:        string;
  unitType:         string;
  materials:        Material[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open,  setOpen]  = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materialId,    setMaterialId]    = useState("");
  const [qty,           setQty]           = useState("");
  const [equipmentType, setEquipmentType] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!materialId || !qty) { setError("Material and quantity are required."); return; }

    startTransition(async () => {
      const result = await addMasterBomLine({
        projectId,
        phaseScopeId,
        phaseActivityId: phaseActivityId ?? undefined,
        activityDefId:   activityDefId   ?? undefined,
        unitModel,
        unitType:        unitType as "BEG" | "MID" | "END" | "SHOP",
        materialId,
        quantityPerUnit: Number(qty),
        equipmentType:   equipmentType || undefined,
      });
      if (result.success) {
        setOpen(false); setMaterialId(""); setQty(""); setEquipmentType("");
        router.refresh();
      } else {
        setError(result.error ?? "Failed to add material line.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "0.3rem 0.7rem", borderRadius: "5px",
          background: "#fff", color: "#1a56db", border: "1px solid #bfdbfe",
          fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
        }}>
        + Add Material
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", flexWrap: "wrap", padding: "0.6rem 0.75rem", background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: "6px" }}>
      <div style={{ flex: "2 1 220px" }}>
        <span style={labelStyle}>Material</span>
        <select required style={inputStyle} value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
          <option value="">Select material…</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.unit})</option>
          ))}
        </select>
      </div>
      <div style={{ flex: "1 1 110px" }}>
        <span style={labelStyle}>Qty / Unit</span>
        <input type="number" required min="0.0001" step="0.0001" style={inputStyle} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0.0000" />
      </div>
      <div style={{ flex: "1 1 140px" }}>
        <span style={labelStyle}>Equipment Type</span>
        <input type="text" maxLength={100} style={inputStyle} value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)} placeholder="optional" />
      </div>
      <button type="submit" disabled={isPending} style={{
        padding: "0.4rem 0.9rem", borderRadius: "5px",
        background: isPending ? "#93c5fd" : "#1a56db", color: "#fff", border: "none",
        fontSize: "0.75rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
      }}>
        {isPending ? "Adding…" : "Add"}
      </button>
      <button type="button" onClick={() => { setOpen(false); setError(null); }} style={{
        padding: "0.4rem 0.7rem", borderRadius: "5px", background: "#fff",
        border: "1px solid #d1d5db", color: "#374151", fontSize: "0.75rem", cursor: "pointer",
      }}>
        Cancel
      </button>
      {error && <span style={{ fontSize: "0.72rem", color: "#b91c1c", flexBasis: "100%" }}>{error}</span>}
    </form>
  );
}

// ── Delete a Draft / Rejected Material line ───────────────────────────────────

export function BomDeleteLineAction({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteDraftBomEntry(id);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to delete.");
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        title="Delete this material line"
        style={{
          padding: "0.2rem 0.55rem", borderRadius: "5px",
          background: "#fff", color: "#b91c1c", border: "1px solid #fecaca",
          fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
        }}>
        Delete
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
      {error && <span style={{ fontSize: "0.72rem", color: "#b91c1c" }}>{error}</span>}
      <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>Remove this line?</span>
      <button onClick={handleDelete} disabled={isPending} style={{
        padding: "0.2rem 0.55rem", borderRadius: "4px", background: isPending ? "#fca5a5" : "#dc2626",
        color: "#fff", border: "none", fontSize: "0.72rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
      }}>
        {isPending ? "…" : "Confirm"}
      </button>
      <button onClick={() => { setConfirming(false); setError(null); }} style={{
        padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#f9fafb",
        border: "1px solid #d1d5db", color: "#374151", fontSize: "0.72rem", cursor: "pointer",
      }}>
        Cancel
      </button>
    </span>
  );
}

// ── Submit DRAFT entries for BOD approval ─────────────────────────────────────

export function BomSubmitActions({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function handleSubmit() {
    setMsg(null);
    startTransition(async () => {
      const result = await submitBomForReview(ids);
      if (result.success) {
        setMsg({ text: `${ids.length} line${ids.length !== 1 ? "s" : ""} submitted for BOD approval.`, ok: true });
        router.refresh();
      } else {
        setMsg({ text: result.error ?? "Failed to submit.", ok: false });
      }
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
      <button
        onClick={handleSubmit}
        disabled={isPending || ids.length === 0}
        style={{
          padding: "0.4rem 0.9rem", borderRadius: "6px",
          background: isPending ? "#93c5fd" : "#2563eb",
          color: "#fff", border: "none", fontSize: "0.78rem",
          fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        }}>
        {isPending ? "Submitting…" : `Submit ${ids.length} line${ids.length !== 1 ? "s" : ""} for BOD Approval`}
      </button>
      {msg && (
        <span style={{ fontSize: "0.78rem", color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</span>
      )}
    </div>
  );
}

// ── Withdraw a line submitted for BOD review (returns it to DRAFT for editing) ─

export function BomWithdrawAction({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleWithdraw() {
    setError(null);
    startTransition(async () => {
      const result = await withdrawBomSubmission(id);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to withdraw.");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      {error && <span style={{ fontSize: "0.72rem", color: "#b91c1c" }}>{error}</span>}
      <button
        onClick={handleWithdraw}
        disabled={isPending}
        title="Return this line to Draft so it can be edited again"
        style={{
          padding: "0.2rem 0.6rem", borderRadius: "4px",
          background: "#fff", color: "#92400e",
          border: "1px solid #fde68a", fontSize: "0.72rem",
          fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        }}>
        {isPending ? "…" : "Withdraw"}
      </button>
    </span>
  );
}

// ── BOD Approve / Reject individual lines ─────────────────────────────────────

export function BomReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await reviewMasterBom(id, "APPROVE");
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to approve.");
      }
    });
  }

  function handleReject() {
    if (!reason.trim()) { setError("Rejection reason is required."); return; }
    setError(null);
    startTransition(async () => {
      const result = await reviewMasterBom(id, "REJECT", reason);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to reject.");
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      {error && <span style={{ fontSize: "0.72rem", color: "#b91c1c" }}>{error}</span>}
      {!showReject ? (
        <>
          <button
            onClick={handleApprove}
            disabled={isPending}
            style={{
              padding: "0.2rem 0.6rem", borderRadius: "4px",
              background: isPending ? "#86efac" : "#16a34a",
              color: "#fff", border: "none", fontSize: "0.72rem",
              fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
            }}>
            {isPending ? "…" : "Approve"}
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={isPending}
            style={{
              padding: "0.2rem 0.6rem", borderRadius: "4px",
              background: "#fef2f2", color: "#b91c1c",
              border: "1px solid #fecaca", fontSize: "0.72rem",
              fontWeight: 600, cursor: "pointer",
            }}>
            Reject
          </button>
        </>
      ) : (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason…"
            style={{
              padding: "0.2rem 0.5rem", border: "1px solid #fca5a5",
              borderRadius: "4px", fontSize: "0.72rem", width: "180px",
            }}
          />
          <button
            onClick={handleReject}
            disabled={isPending}
            style={{
              padding: "0.2rem 0.6rem", borderRadius: "4px",
              background: "#dc2626", color: "#fff",
              border: "none", fontSize: "0.72rem",
              fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
            }}>
            {isPending ? "…" : "Confirm"}
          </button>
          <button
            onClick={() => { setShowReject(false); setError(null); }}
            style={{
              padding: "0.2rem 0.5rem", borderRadius: "4px",
              background: "#f9fafb", border: "1px solid #d1d5db",
              color: "#374151", fontSize: "0.72rem", cursor: "pointer",
            }}>
            Cancel
          </button>
        </span>
      )}
    </span>
  );
}
