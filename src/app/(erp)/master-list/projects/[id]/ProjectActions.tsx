"use client";

import { useState, useTransition } from "react";
import {
  approveProject, createBlock, createProjectUnit,
  updateBlock, deleteBlock, updateProjectUnit, deleteProjectUnit,
} from "@/actions/master-list";
import { useRouter } from "next/navigation";

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.5rem 0.75rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem",
};

// ─── BOD Approval Button ────────────────────────────────────────────────────

export function ApproveProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleApprove() {
    startTransition(async () => {
      await approveProject(projectId);
      setDone(true);
      router.refresh();
    });
  }

  if (done) return <span style={{ fontSize: "0.8rem", color: "#166534", fontWeight: 600 }}>✓ Approved</span>;

  return (
    <button onClick={handleApprove} disabled={isPending} style={{
      padding: "0.5rem 1rem", borderRadius: "6px", background: isPending ? "#86efac" : "#16a34a",
      color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
    }}>
      {isPending ? "Approving…" : "BOD Approve"}
    </button>
  );
}

// ─── Add Block Form ─────────────────────────────────────────────────────────

export function AddBlockForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [blockName, setBlockName] = useState("");
  const [totalLots, setTotalLots] = useState("1");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createBlock({ projectId, blockName, totalLots: Number(totalLots) });
      if (result.success) {
        setOpen(false);
        setBlockName("");
        setTotalLots("1");
        router.refresh();
      } else {
        setError(result.error ?? "Error");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        padding: "0.4rem 0.85rem", borderRadius: "6px", background: "#f3f4f6",
        color: "#374151", border: "1px solid #d1d5db", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
      }}>+ Add Block</button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
      {error && <div style={{ width: "100%", fontSize: "0.8rem", color: "#b91c1c" }}>{error}</div>}
      <label style={{ flex: "1 1 120px" }}>
        <span style={labelStyle}>Block Name</span>
        <input type="text" required value={blockName} onChange={(e) => setBlockName(e.target.value)}
          placeholder="e.g. Block A" style={inputStyle} />
      </label>
      <label style={{ flex: "0 0 90px" }}>
        <span style={labelStyle}>Total Lots</span>
        <input type="number" min="1" required value={totalLots} onChange={(e) => setTotalLots(e.target.value)} style={inputStyle} />
      </label>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button type="submit" disabled={isPending} style={{
          padding: "0.5rem 0.9rem", borderRadius: "6px", background: "#6366f1",
          color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
        }}>{isPending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} style={{
          padding: "0.5rem 0.9rem", borderRadius: "6px", background: "#f3f4f6",
          color: "#374151", border: "1px solid #d1d5db", fontSize: "0.8rem", cursor: "pointer",
        }}>Cancel</button>
      </div>
    </form>
  );
}

// ─── Edit Block Form ────────────────────────────────────────────────────────

export function EditBlockForm({ blockId, initialName, initialLots }: {
  blockId: string;
  initialName: string;
  initialLots: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [blockName, setBlockName] = useState(initialName);
  const [totalLots, setTotalLots] = useState(String(initialLots));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateBlock(blockId, { blockName, totalLots: Number(totalLots) });
      if (result.success) { setOpen(false); router.refresh(); }
      else setError(result.error ?? "Error");
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        padding: "0.25rem 0.6rem", borderRadius: "4px", background: "#eff6ff",
        color: "#1e40af", border: "1px solid #bfdbfe", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
      }}>Edit</button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-end", flexWrap: "wrap" }}>
      {error && <div style={{ width: "100%", fontSize: "0.78rem", color: "#b91c1c" }}>{error}</div>}
      <label style={{ flex: "1 1 100px" }}>
        <span style={labelStyle}>Name</span>
        <input type="text" required value={blockName} onChange={(e) => setBlockName(e.target.value)} style={inputStyle} />
      </label>
      <label style={{ flex: "0 0 80px" }}>
        <span style={labelStyle}>Total Lots</span>
        <input type="number" min="1" required value={totalLots} onChange={(e) => setTotalLots(e.target.value)} style={inputStyle} />
      </label>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button type="submit" disabled={isPending} style={{
          padding: "0.4rem 0.75rem", borderRadius: "4px", background: "#6366f1",
          color: "#fff", border: "none", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
        }}>{isPending ? "…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} style={{
          padding: "0.4rem 0.65rem", borderRadius: "4px", background: "#f3f4f6",
          border: "1px solid #d1d5db", color: "#374151", fontSize: "0.78rem", cursor: "pointer",
        }}>Cancel</button>
      </div>
    </form>
  );
}

// ─── Delete Block Button ────────────────────────────────────────────────────

export function DeleteBlockButton({ blockId }: { blockId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBlock(blockId);
      if (result.success) router.refresh();
      else { setError(result.error ?? "Error"); setConfirm(false); }
    });
  }

  if (error) return (
    <span style={{ fontSize: "0.72rem", color: "#b91c1c" }}>{error} <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "0.72rem" }}>✕</button></span>
  );

  if (confirm) return (
    <span style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
      <span style={{ fontSize: "0.72rem", color: "#b91c1c" }}>Delete block?</span>
      <button onClick={handleDelete} disabled={isPending} style={{
        padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#dc2626", color: "#fff",
        border: "none", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
      }}>{isPending ? "…" : "Yes"}</button>
      <button onClick={() => setConfirm(false)} style={{
        padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#f3f4f6",
        border: "1px solid #d1d5db", color: "#374151", fontSize: "0.72rem", cursor: "pointer",
      }}>No</button>
    </span>
  );

  return (
    <button onClick={() => setConfirm(true)} style={{
      padding: "0.25rem 0.6rem", borderRadius: "4px", background: "#fef2f2",
      color: "#b91c1c", border: "1px solid #fecaca", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
    }}>Delete</button>
  );
}

// ─── Add Unit Form ──────────────────────────────────────────────────────────

export function AddUnitForm({ projectId, blockOptions }: {
  projectId: string;
  blockOptions: { id: string; blockName: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [blockId, setBlockId] = useState(blockOptions[0]?.id ?? "");
  const [lotNumber, setLotNumber] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [unitModel, setUnitModel] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!blockId) { setError("Select a block first."); return; }
    startTransition(async () => {
      const result = await createProjectUnit({ projectId, blockId, lotNumber, unitCode, unitModel });
      if (result.success) {
        setOpen(false);
        setLotNumber(""); setUnitCode(""); setUnitModel("");
        router.refresh();
      } else {
        setError(result.error ?? "Error");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        padding: "0.4rem 0.85rem", borderRadius: "6px", background: "#6366f1",
        color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
      }}>+ Add Unit</button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap", background: "#f9fafb", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
      {error && <div style={{ width: "100%", fontSize: "0.8rem", color: "#b91c1c" }}>{error}</div>}
      <label style={{ flex: "0 0 120px" }}>
        <span style={labelStyle}>Block</span>
        <select required value={blockId} onChange={(e) => setBlockId(e.target.value)} style={inputStyle}>
          {blockOptions.map((b) => <option key={b.id} value={b.id}>{b.blockName}</option>)}
        </select>
      </label>
      <label style={{ flex: "0 0 80px" }}>
        <span style={labelStyle}>Lot #</span>
        <input type="text" required value={lotNumber} onChange={(e) => setLotNumber(e.target.value)}
          placeholder="1" style={inputStyle} />
      </label>
      <label style={{ flex: "0 0 120px" }}>
        <span style={labelStyle}>Unit Code</span>
        <input type="text" required value={unitCode} onChange={(e) => setUnitCode(e.target.value)}
          placeholder="BLK-A-001" style={inputStyle} />
      </label>
      <label style={{ flex: "1 1 120px" }}>
        <span style={labelStyle}>Unit Model</span>
        <input type="text" required value={unitModel} onChange={(e) => setUnitModel(e.target.value)}
          placeholder="Type A / 2BR" style={inputStyle} />
      </label>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button type="submit" disabled={isPending} style={{
          padding: "0.5rem 0.9rem", borderRadius: "6px", background: "#6366f1",
          color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
        }}>{isPending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setOpen(false)} style={{
          padding: "0.5rem 0.9rem", borderRadius: "6px", background: "#f3f4f6",
          color: "#374151", border: "1px solid #d1d5db", fontSize: "0.8rem", cursor: "pointer",
        }}>Cancel</button>
      </div>
    </form>
  );
}

// ─── Unit Row (edit + delete inline) ────────────────────────────────────────

type UnitStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | string;
const UNIT_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:     { bg: "#f3f4f6", color: "#6b7280" },
  IN_PROGRESS: { bg: "#eff6ff", color: "#1e40af" },
  COMPLETED:   { bg: "#dcfce7", color: "#166534" },
};

export function UnitRow({ unit, blockOptions }: {
  unit: { id: string; blockId: string; lotNumber: string; unitCode: string; unitModel: string; status: UnitStatus; contractPrice?: string | null };
  blockOptions: { id: string; blockName: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [blockId, setBlockId] = useState(unit.blockId);
  const [lotNumber, setLotNumber] = useState(unit.lotNumber);
  const [unitCode, setUnitCode] = useState(unit.unitCode);
  const [unitModel, setUnitModel] = useState(unit.unitModel);
  const [contractPrice, setContractPrice] = useState(unit.contractPrice ?? "");

  const us = UNIT_STATUS_STYLE[unit.status] ?? { bg: "#f3f4f6", color: "#6b7280" };

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateProjectUnit(unit.id, { blockId, lotNumber, unitCode, unitModel, contractPrice: contractPrice || undefined });
      if (result.success) { setEditing(false); router.refresh(); }
      else setError(result.error ?? "Error");
    });
  }

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteProjectUnit(unit.id);
      if (result.success) router.refresh();
      else { setError(result.error ?? "Error"); setConfirm(false); }
    });
  }

  if (editing) {
    return (
      <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
        <td colSpan={5} style={{ padding: "0.6rem 0.9rem" }}>
          <form onSubmit={handleSave} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            {error && <div style={{ width: "100%", fontSize: "0.78rem", color: "#b91c1c" }}>{error}</div>}
            <label style={{ flex: "0 0 100px" }}>
              <span style={labelStyle}>Block</span>
              <select value={blockId} onChange={(e) => setBlockId(e.target.value)} style={inputStyle}>
                {blockOptions.map((b) => <option key={b.id} value={b.id}>{b.blockName}</option>)}
              </select>
            </label>
            <label style={{ flex: "0 0 65px" }}>
              <span style={labelStyle}>Lot #</span>
              <input type="text" required value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ flex: "0 0 110px" }}>
              <span style={labelStyle}>Unit Code</span>
              <input type="text" required value={unitCode} onChange={(e) => setUnitCode(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ flex: "1 1 100px" }}>
              <span style={labelStyle}>Model</span>
              <input type="text" required value={unitModel} onChange={(e) => setUnitModel(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ flex: "0 0 120px" }}>
              <span style={labelStyle}>Contract Price</span>
              <input type="number" min="0" step="0.01" value={contractPrice}
                onChange={(e) => setContractPrice(e.target.value)} placeholder="optional" style={inputStyle} />
            </label>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button type="submit" disabled={isPending} style={{
                padding: "0.45rem 0.8rem", borderRadius: "4px", background: "#6366f1",
                color: "#fff", border: "none", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
              }}>{isPending ? "…" : "Save"}</button>
              <button type="button" onClick={() => setEditing(false)} style={{
                padding: "0.45rem 0.65rem", borderRadius: "4px", background: "#f3f4f6",
                border: "1px solid #d1d5db", color: "#374151", fontSize: "0.78rem", cursor: "pointer",
              }}>Cancel</button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: "1px solid #f9fafb" }}>
      <td style={{ padding: "0.5rem 0.9rem", color: "#6b7280" }}>{unit.lotNumber}</td>
      <td style={{ padding: "0.5rem 0.9rem", fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{unit.unitCode}</td>
      <td style={{ padding: "0.5rem 0.9rem", color: "#374151" }}>{unit.unitModel}</td>
      <td style={{ padding: "0.5rem 0.9rem" }}>
        <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600, background: us.bg, color: us.color }}>{unit.status}</span>
      </td>
      <td style={{ padding: "0.5rem 0.9rem" }}>
        {error && <span style={{ fontSize: "0.7rem", color: "#b91c1c", marginRight: "0.5rem" }}>{error} <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "0.7rem" }}>✕</button></span>}
        {confirm ? (
          <span style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.7rem", color: "#b91c1c" }}>Delete?</span>
            <button onClick={handleDelete} disabled={isDeleting} style={{
              padding: "0.2rem 0.45rem", borderRadius: "4px", background: "#dc2626", color: "#fff",
              border: "none", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
            }}>{isDeleting ? "…" : "Yes"}</button>
            <button onClick={() => setConfirm(false)} style={{
              padding: "0.2rem 0.45rem", borderRadius: "4px", background: "#f3f4f6",
              border: "1px solid #d1d5db", color: "#374151", fontSize: "0.7rem", cursor: "pointer",
            }}>No</button>
          </span>
        ) : (
          <span style={{ display: "inline-flex", gap: "0.35rem" }}>
            <button onClick={() => setEditing(true)} style={{
              padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#eff6ff",
              color: "#1e40af", border: "1px solid #bfdbfe", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
            }}>Edit</button>
            <button onClick={() => setConfirm(true)} style={{
              padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#fef2f2",
              color: "#b91c1c", border: "1px solid #fecaca", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
            }}>Delete</button>
          </span>
        )}
      </td>
    </tr>
  );
}
