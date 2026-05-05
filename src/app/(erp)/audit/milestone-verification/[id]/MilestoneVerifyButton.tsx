"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyMilestone } from "@/actions/audit";

export function MilestoneVerifyButton({
  milestoneId, unitId,
}: {
  milestoneId: string;
  unitId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<"VERIFIED" | "REJECTED">("VERIFIED");

  function handle() {
    setError(null);
    startTransition(async () => {
      const result = await verifyMilestone({ unitId, auditStatus: status, remarks: remarks || undefined });
      if (result.success) router.refresh();
      else setError(result.error ?? "Failed.");
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {error && <div style={{ color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {(["VERIFIED", "REJECTED"] as const).map((s) => (
          <label key={s} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.875rem", cursor: "pointer" }}>
            <input type="radio" checked={status === s} onChange={() => setStatus(s)} />
            {s}
          </label>
        ))}
      </div>
      <textarea
        placeholder="Remarks (optional)"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        style={{ padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", resize: "vertical", minHeight: "64px" }}
      />
      <button
        onClick={handle}
        disabled={isPending}
        style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#c4b5fd" : status === "VERIFIED" ? "#7e3af2" : "#dc2626",
          color: "#fff", border: "none", fontWeight: 600,
          fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer", alignSelf: "flex-start",
        }}>
        {isPending ? "Saving…" : status === "VERIFIED" ? "Mark as Verified" : "Mark as Rejected"}
      </button>
    </div>
  );
}
