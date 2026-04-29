"use client";

import { useState, useTransition } from "react";
import { approveProject, createBlock, createProjectUnit } from "@/actions/master-list";
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
