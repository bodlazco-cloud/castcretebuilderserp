"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createVarianceRequest, submitVarianceRequest } from "@/actions/planning";

type Project   = { id: string; name: string };
type BomEntry  = { id: string; projectId: string; unitModel: string; unitType: string; status: string; materialName: string | null; activityName: string | null };
type Material  = { id: string; name: string; unit: string; code: string };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem",
  boxSizing: "border-box", color: "#374151", background: "#fff",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151",
  textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.4rem",
};

export function NewVarianceForm({ projects, bomEntries, materials }: {
  projects: Project[];
  bomEntries: BomEntry[];
  materials: Material[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [projectId,     setProjectId]     = useState("");
  const [requestType,   setRequestType]   = useState<"BOM_CHANGE" | "PROCUREMENT_VARIANCE">("BOM_CHANGE");
  const [bomEntryId,    setBomEntryId]    = useState("");
  const [bomChangeType, setBomChangeType] = useState<"ADD" | "MODIFY" | "REMOVE">("MODIFY");
  const [oldQty,        setOldQty]        = useState("");
  const [newQty,        setNewQty]        = useState("");
  const [newMaterialId, setNewMaterialId] = useState("");
  const [requestedQty,  setRequestedQty]  = useState("");
  const [isMinOrderQty, setIsMinOrderQty] = useState(false);
  const [reason,        setReason]        = useState("");

  const projectBomEntries = bomEntries.filter((b) => b.projectId === projectId);

  async function handleSubmit(e: React.FormEvent, andSubmit: boolean) {
    e.preventDefault();
    setError(null);

    if (!projectId || !reason.trim()) {
      setError("Project and reason are required.");
      return;
    }

    startTransition(async () => {
      const result = await createVarianceRequest({
        projectId,
        requestType,
        masterBomEntryId:    bomEntryId || undefined,
        bomChangeType:       requestType === "BOM_CHANGE" ? bomChangeType : undefined,
        oldQuantity:         oldQty ? Number(oldQty) : undefined,
        newQuantity:         newQty ? Number(newQty) : undefined,
        newMaterialId:       newMaterialId || undefined,
        requestedQuantity:   requestedQty ? Number(requestedQty) : undefined,
        isMinOrderQtyIssue:  isMinOrderQty,
        reason,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (andSubmit) {
        await submitVarianceRequest(result.id);
      }

      router.push("/planning/variance-requests");
    });
  }

  return (
    <form style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* Project */}
      <div>
        <label style={labelStyle}>Project *</label>
        <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setBomEntryId(""); }} style={inputStyle} required>
          <option value="">Select project…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Request Type */}
      <div>
        <label style={labelStyle}>Request Type *</label>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {(["BOM_CHANGE", "PROCUREMENT_VARIANCE"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setRequestType(t)}
              style={{
                padding: "0.55rem 1.1rem", borderRadius: "6px", fontSize: "0.875rem", fontWeight: 600,
                cursor: "pointer", border: "1px solid",
                background: requestType === t ? "#1a56db" : "#fff",
                color: requestType === t ? "#fff" : "#374151",
                borderColor: requestType === t ? "#1a56db" : "#d1d5db",
              }}
            >
              {t === "BOM_CHANGE" ? "BOM Change" : "Procurement Variance"}
            </button>
          ))}
        </div>
      </div>

      {requestType === "BOM_CHANGE" && (
        <>
          <div>
            <label style={labelStyle}>Affected BOM Entry (optional)</label>
            <select value={bomEntryId} onChange={(e) => setBomEntryId(e.target.value)} style={inputStyle} disabled={!projectId}>
              <option value="">Select approved BOM entry…</option>
              {projectBomEntries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.materialName} — {b.unitModel}/{b.unitType} ({b.activityName})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Change Type</label>
              <select value={bomChangeType} onChange={(e) => setBomChangeType(e.target.value as "ADD" | "MODIFY" | "REMOVE")} style={inputStyle}>
                <option value="ADD">Add</option>
                <option value="MODIFY">Modify</option>
                <option value="REMOVE">Remove</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Old Quantity</label>
              <input type="number" value={oldQty} onChange={(e) => setOldQty(e.target.value)} placeholder="0.0000" step="0.0001" min="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>New Quantity</label>
              <input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="0.0000" step="0.0001" min="0" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>New Material (if replacing)</label>
            <select value={newMaterialId} onChange={(e) => setNewMaterialId(e.target.value)} style={inputStyle}>
              <option value="">No material change</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.unit})</option>)}
            </select>
          </div>
        </>
      )}

      {requestType === "PROCUREMENT_VARIANCE" && (
        <>
          <div>
            <label style={labelStyle}>Requested Quantity (overage)</label>
            <input type="number" value={requestedQty} onChange={(e) => setRequestedQty(e.target.value)} placeholder="0.0000" step="0.0001" min="0" style={inputStyle} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <input
              type="checkbox"
              id="minOrderQty"
              checked={isMinOrderQty}
              onChange={(e) => setIsMinOrderQty(e.target.checked)}
              style={{ width: "1rem", height: "1rem", accentColor: "#dc2626" }}
            />
            <label htmlFor="minOrderQty" style={{ fontSize: "0.875rem", color: "#374151", cursor: "pointer" }}>
              This is a minimum order quantity issue{" "}
              <span style={{ fontSize: "0.78rem", color: "#b91c1c" }}>(requires BOD approval)</span>
            </label>
          </div>
        </>
      )}

      {/* Reason */}
      <div>
        <label style={labelStyle}>Justification / Reason *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Explain why this variance is needed…"
          style={{ ...inputStyle, resize: "none" }}
          required
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, false)}
          disabled={isPending}
          style={{
            padding: "0.65rem 1.25rem", borderRadius: "6px", background: "#fff",
            border: "1px solid #d1d5db", color: "#374151", fontSize: "0.875rem",
            fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
          }}>
          Save as Draft
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={isPending}
          style={{
            padding: "0.65rem 1.25rem", borderRadius: "6px", background: isPending ? "#93c5fd" : "#1a56db",
            border: "none", color: "#fff", fontSize: "0.875rem",
            fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
          }}>
          {isPending ? "Submitting…" : "Submit for Review"}
        </button>
        <a
          href="/planning/variance-requests"
          style={{
            padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
            color: "#374151", fontSize: "0.875rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
          }}>
          Cancel
        </a>
      </div>
    </form>
  );
}
