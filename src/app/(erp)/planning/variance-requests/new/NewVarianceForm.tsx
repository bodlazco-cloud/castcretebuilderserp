"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createVarianceRequest, submitVarianceRequest } from "@/actions/planning";

type Project   = { id: string; name: string };
type BomEntry  = { id: string; projectId: string; unitModel: string; unitType: string; status: string; materialName: string | null; activityName: string | null };
type Material  = { id: string; name: string; unit: string; code: string };

const inputCls = "block w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-500";
const labelCls = "block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5";

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
    <form className="space-y-5">
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Project */}
      <div>
        <label className={labelCls}>Project *</label>
        <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setBomEntryId(""); }} className={inputCls} required>
          <option value="">Select project…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Request Type */}
      <div>
        <label className={labelCls}>Request Type *</label>
        <div className="flex gap-3">
          {(["BOM_CHANGE", "PROCUREMENT_VARIANCE"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setRequestType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                requestType === t ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {t === "BOM_CHANGE" ? "BOM Change" : "Procurement Variance"}
            </button>
          ))}
        </div>
      </div>

      {requestType === "BOM_CHANGE" && (
        <>
          <div>
            <label className={labelCls}>Affected BOM Entry (optional)</label>
            <select value={bomEntryId} onChange={(e) => setBomEntryId(e.target.value)} className={inputCls} disabled={!projectId}>
              <option value="">Select approved BOM entry…</option>
              {projectBomEntries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.materialName} — {b.unitModel}/{b.unitType} ({b.activityName})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Change Type</label>
              <select value={bomChangeType} onChange={(e) => setBomChangeType(e.target.value as "ADD" | "MODIFY" | "REMOVE")} className={inputCls}>
                <option value="ADD">Add</option>
                <option value="MODIFY">Modify</option>
                <option value="REMOVE">Remove</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Old Quantity</label>
              <input type="number" value={oldQty} onChange={(e) => setOldQty(e.target.value)} placeholder="0.0000" step="0.0001" min="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>New Quantity</label>
              <input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="0.0000" step="0.0001" min="0" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>New Material (if replacing)</label>
            <select value={newMaterialId} onChange={(e) => setNewMaterialId(e.target.value)} className={inputCls}>
              <option value="">No material change</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.unit})</option>)}
            </select>
          </div>
        </>
      )}

      {requestType === "PROCUREMENT_VARIANCE" && (
        <>
          <div>
            <label className={labelCls}>Requested Quantity (overage)</label>
            <input type="number" value={requestedQty} onChange={(e) => setRequestedQty(e.target.value)} placeholder="0.0000" step="0.0001" min="0" className={inputCls} />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="minOrderQty"
              checked={isMinOrderQty}
              onChange={(e) => setIsMinOrderQty(e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            <label htmlFor="minOrderQty" className="text-sm text-zinc-300">
              This is a minimum order quantity issue{" "}
              <span className="text-xs text-red-400">(requires BOD approval)</span>
            </label>
          </div>
        </>
      )}

      {/* Reason */}
      <div>
        <label className={labelCls}>Justification / Reason *</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Explain why this variance is needed…"
          className={`${inputCls} resize-none`}
          required
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={(e) => handleSubmit(e, false)}
          disabled={isPending}
          className="px-4 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={isPending}
          className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Submit for Review"}
        </button>
        <a
          href="/planning/variance-requests"
          className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
