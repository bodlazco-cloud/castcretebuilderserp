"use client";

import { useState, useTransition } from "react";
import { logEquipmentRental } from "@/actions/batching";

type Equipment = { id: string; code: string; name: string; dailyRentalRate: string };
type Project   = { id: string; name: string };
type ProdLog   = { id: string; batchDate: string; shift: string; mixCode: string; projectName: string };

const ACCENT = "#7c3aed";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function LogRentalForm({
  equipmentList, projects, productionLogs, userId,
}: {
  equipmentList: Equipment[];
  projects: Project[];
  productionLogs: ProdLog[];
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error,  setError]  = useState<string | null>(null);
  const [result, setResult] = useState<{ totalCost: number; ledgerPosted: boolean } | null>(null);
  const [show, setShow] = useState(false);

  const [selectedEquipId, setSelectedEquipId] = useState("");
  const [projectId,       setProjectId]       = useState("");
  const [productionLogId, setProductionLogId] = useState("");
  const [usageDate,       setUsageDate]       = useState(new Date().toISOString().slice(0, 10));
  const [hours,           setHours]           = useState("");
  const [notes,           setNotes]           = useState("");

  const selectedEquip = equipmentList.find((e) => e.id === selectedEquipId);
  const hourlyRate    = selectedEquip ? Number(selectedEquip.dailyRentalRate) / 8 : 0;
  const estimatedCost = hours && hourlyRate ? (parseFloat(hours) * hourlyRate) : 0;

  function reset() {
    setSelectedEquipId(""); setProjectId(""); setProductionLogId("");
    setUsageDate(new Date().toISOString().slice(0, 10));
    setHours(""); setNotes(""); setResult(null); setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await logEquipmentRental({
        equipmentId:     selectedEquipId,
        projectId,
        productionLogId: productionLogId || undefined,
        usageDate,
        hoursOperated:   parseFloat(hours),
        notes:           notes || undefined,
        loggedBy:        userId,
      });
      if (res.success) {
        setResult({ totalCost: res.totalCost, ledgerPosted: res.ledgerPosted });
      } else {
        setError(res.error);
      }
    });
  }

  if (result) {
    return (
      <div style={{ padding: "1.25rem 1.5rem", background: "#f5f3ff", borderRadius: "8px", border: "1px solid #ddd6fe", textAlign: "center" }}>
        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#6d28d9", marginBottom: "0.4rem" }}>
          ✓ Equipment Rental Logged
        </div>
        <div style={{ fontSize: "0.875rem", color: "#374151", marginBottom: "0.5rem" }}>
          Total cost: <strong>₱{result.totalCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
        </div>
        {result.ledgerPosted ? (
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "#5b21b6" }}>
            Ledger posted: Debit Batching Plant / Credit Motorpool
          </p>
        ) : (
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "#92400e" }}>
            Note: Ledger not posted — departments/cost centers may not be configured.
          </p>
        )}
        <button onClick={() => { reset(); setShow(false); }} style={{
          padding: "0.55rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          background: "#fff", color: "#374151", fontSize: "0.85rem", cursor: "pointer", marginRight: "0.5rem",
        }}>Done</button>
        <button onClick={() => { reset(); }} style={{
          padding: "0.55rem 1.25rem", borderRadius: "6px", border: "none",
          background: ACCENT, color: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
        }}>Log Another</button>
      </div>
    );
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} style={{
        padding: "0.65rem 1.25rem", borderRadius: "6px", border: "none",
        background: ACCENT, color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
      }}>
        + Log Equipment Rental
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px",
      padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>Log Equipment Rental</h3>
        <button type="button" onClick={() => { reset(); setShow(false); }} style={{
          background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.1rem", lineHeight: 1,
        }}>✕</button>
      </div>

      {error && (
        <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Project *</span>
          <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inputStyle}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Usage Date *</span>
          <input type="date" required value={usageDate} onChange={(e) => setUsageDate(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Equipment *</span>
          <select required value={selectedEquipId} onChange={(e) => setSelectedEquipId(e.target.value)} style={inputStyle}>
            <option value="">Select equipment…</option>
            {equipmentList.map((e) => (
              <option key={e.id} value={e.id}>{e.code} — {e.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Hours Operated *</span>
          <input
            type="number" min="0.5" max="24" step="0.5" required
            value={hours} onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 4.0"
            style={inputStyle}
          />
        </label>
      </div>

      {selectedEquip && (
        <div style={{ padding: "0.65rem 1rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", fontSize: "0.78rem", color: "#1e40af" }}>
          Daily rate: <strong>₱{Number(selectedEquip.dailyRentalRate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
          &nbsp;·&nbsp;
          Hourly rate: <strong>₱{hourlyRate.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
          {estimatedCost > 0 && (
            <>&nbsp;·&nbsp;Estimated cost: <strong>₱{estimatedCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></>
          )}
        </div>
      )}

      <label>
        <span style={labelStyle}>Link to Production Batch (optional)</span>
        <select value={productionLogId} onChange={(e) => setProductionLogId(e.target.value)} style={inputStyle}>
          <option value="">None — standalone rental</option>
          {productionLogs.map((l) => (
            <option key={l.id} value={l.id}>
              {l.batchDate} {l.shift} — {l.mixCode} ({l.projectName})
            </option>
          ))}
        </select>
      </label>

      <label>
        <span style={labelStyle}>Notes</span>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Operated concrete mixer for AM pour"
          style={inputStyle} maxLength={500} />
      </label>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => { reset(); setShow(false); }} style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          background: "#fff", color: "#374151", fontSize: "0.875rem", cursor: "pointer",
        }}>Cancel</button>
        <button
          type="submit"
          disabled={isPending || !selectedEquipId || !projectId || !hours}
          style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: isPending || !selectedEquipId || !projectId || !hours ? "#c4b5fd" : ACCENT,
            color: "#fff", border: "none", fontSize: "0.875rem", fontWeight: 600,
            cursor: isPending || !selectedEquipId || !projectId || !hours ? "not-allowed" : "pointer",
          }}
        >
          {isPending ? "Saving…" : "Log Rental"}
        </button>
      </div>
    </form>
  );
}
