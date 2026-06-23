"use client";

import { useState, useTransition } from "react";
import { addMaintenanceRecord } from "@/actions/motorpool";

type Equipment = { id: string; code: string; name: string };

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

export function AddMaintenanceForm({ equipmentList, userId }: { equipmentList: Equipment[]; userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [show, setShow]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone]   = useState(false);

  const [equipmentId,     setEquipmentId]     = useState("");
  const [maintenanceType, setMaintenanceType] = useState<"PREVENTIVE"|"CORRECTIVE"|"EMERGENCY">("PREVENTIVE");
  const [description,     setDescription]     = useState("");
  const [partsCost,       setPartsCost]       = useState("0");
  const [laborCost,       setLaborCost]       = useState("0");
  const [downtimeDays,    setDowntimeDays]    = useState("0");
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().slice(0, 10));

  const totalCost = (parseFloat(partsCost) || 0) + (parseFloat(laborCost) || 0);

  function reset() {
    setEquipmentId(""); setMaintenanceType("PREVENTIVE"); setDescription("");
    setPartsCost("0"); setLaborCost("0"); setDowntimeDays("0");
    setMaintenanceDate(new Date().toISOString().slice(0, 10));
    setError(null); setDone(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addMaintenanceRecord({
        equipmentId,
        maintenanceType,
        description,
        partsCost: parseFloat(partsCost) || 0,
        laborCost: parseFloat(laborCost) || 0,
        downtimeDays: parseInt(downtimeDays) || 0,
        maintenanceDate,
        recordedBy: userId,
      });
      if (res.success) setDone(true);
      else setError(res.error);
    });
  }

  if (done) {
    return (
      <div style={{ padding: "1rem 1.25rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 700, color: "#16a34a", marginBottom: "0.5rem" }}>✓ Maintenance Record Added</div>
        <button onClick={() => { reset(); setShow(false); window.location.reload(); }} style={{
          padding: "0.5rem 1.25rem", borderRadius: "6px", border: "none",
          background: "#0694a2", color: "#fff", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
        }}>Done</button>
        <button onClick={reset} style={{
          marginLeft: "0.5rem", padding: "0.5rem 1.25rem", borderRadius: "6px",
          border: "1px solid #d1d5db", background: "#fff", fontSize: "0.82rem", cursor: "pointer",
        }}>Add Another</button>
      </div>
    );
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} style={{
        padding: "0.65rem 1.25rem", borderRadius: "6px", border: "none",
        background: "#0694a2", color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
      }}>
        + Add Maintenance Record
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px",
      padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem",
      marginBottom: "1.5rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Add Maintenance Record</h3>
        <button type="button" onClick={() => { reset(); setShow(false); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.1rem" }}>✕</button>
      </div>

      {error && <div style={{ padding: "0.7rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Equipment *</span>
          <select required value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} style={inputStyle}>
            <option value="">Select equipment…</option>
            {equipmentList.map((eq) => <option key={eq.id} value={eq.id}>{eq.code} — {eq.name}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Type *</span>
          <select value={maintenanceType} onChange={(e) => setMaintenanceType(e.target.value as "PREVENTIVE"|"CORRECTIVE"|"EMERGENCY")} style={inputStyle}>
            <option value="PREVENTIVE">Preventive</option>
            <option value="CORRECTIVE">Corrective</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
        </label>
        <label>
          <span style={labelStyle}>Date *</span>
          <input type="date" required value={maintenanceDate} onChange={(e) => setMaintenanceDate(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <label>
        <span style={labelStyle}>Description *</span>
        <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Replace brake pads and check hydraulic fluid" style={inputStyle} maxLength={1000} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Parts Cost (₱)</span>
          <input type="number" min="0" step="0.01" value={partsCost} onChange={(e) => setPartsCost(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Labor Cost (₱)</span>
          <input type="number" min="0" step="0.01" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Downtime Days</span>
          <input type="number" min="0" step="1" value={downtimeDays} onChange={(e) => setDowntimeDays(e.target.value)} style={inputStyle} />
        </label>
        <div>
          <span style={{ ...labelStyle, color: "#6b7280" }}>Total Cost</span>
          <div style={{ ...inputStyle, background: "#f9fafb", fontWeight: 700, color: "#0694a2", fontFamily: "monospace" }}>
            ₱{totalCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => { reset(); setShow(false); }} style={{
          padding: "0.6rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          background: "#fff", color: "#374151", fontSize: "0.875rem", cursor: "pointer",
        }}>Cancel</button>
        <button type="submit" disabled={isPending || !equipmentId || !description} style={{
          padding: "0.6rem 1.5rem", borderRadius: "6px", border: "none",
          background: isPending || !equipmentId || !description ? "#7dd3d8" : "#0694a2",
          color: "#fff", fontSize: "0.875rem", fontWeight: 600,
          cursor: isPending || !equipmentId || !description ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Saving…" : "Save Record"}
        </button>
      </div>
    </form>
  );
}
