"use client";

import { useState, useTransition } from "react";
import { approvePayrollRun, rejectPayrollRun } from "@/actions/hr";

export default function ApproveButton({ runId }: { runId: string }) {
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  function handleApprove() {
    startTransition(async () => {
      const result = await approvePayrollRun({ runId });
      if (!result.success) alert(result.error);
    });
  }

  function handleReject() {
    if (!note.trim()) { alert("A rejection reason is required."); return; }
    startTransition(async () => {
      const result = await rejectPayrollRun({ runId, note: note.trim() });
      if (!result.success) alert(result.error);
      else setRejecting(false);
    });
  }

  if (rejecting) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "280px" }}>
        <textarea
          rows={3}
          placeholder="Reason for returning to site…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isPending}
          style={{
            padding: "0.5rem", fontSize: "0.8rem", borderRadius: "6px",
            border: "1px solid #fca5a5", resize: "vertical", fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleReject}
            disabled={isPending}
            style={{
              padding: "0.4rem 1rem", background: isPending ? "#d1d5db" : "#dc2626",
              color: "#fff", border: "none", borderRadius: "6px",
              fontWeight: 600, fontSize: "0.8rem", cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Returning…" : "Confirm Return"}
          </button>
          <button
            onClick={() => { setRejecting(false); setNote(""); }}
            disabled={isPending}
            style={{
              padding: "0.4rem 0.75rem", background: "transparent",
              color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "6px",
              fontSize: "0.8rem", cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <button
        onClick={handleApprove}
        disabled={isPending}
        style={{
          padding: "0.5rem 1.25rem",
          background: isPending ? "#d1d5db" : "#16a34a",
          color: "#fff", border: "none", borderRadius: "6px",
          fontWeight: 600, fontSize: "0.875rem",
          cursor: isPending ? "not-allowed" : "pointer",
        }}
      >
        {isPending ? "Approving…" : "✓ Approve Run"}
      </button>
      <button
        onClick={() => setRejecting(true)}
        disabled={isPending}
        style={{
          padding: "0.5rem 1.25rem",
          background: "#fff", color: "#dc2626",
          border: "1px solid #fca5a5", borderRadius: "6px",
          fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
        }}
      >
        ↩ Return to Site
      </button>
    </div>
  );
}
