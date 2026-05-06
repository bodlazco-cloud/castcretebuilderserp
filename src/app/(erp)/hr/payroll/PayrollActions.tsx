"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approvePayroll, releasePayroll } from "@/actions/hr";

export function PayrollActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      await approvePayroll(id);
      router.refresh();
    });
  }

  function handleRelease() {
    startTransition(async () => {
      await releasePayroll(id);
      router.refresh();
    });
  }

  if (status === "DRAFT") {
    return (
      <button onClick={handleApprove} disabled={isPending} style={{
        padding: "0.25rem 0.65rem", borderRadius: "4px", background: "#057a55",
        color: "#fff", border: "none", fontSize: "0.75rem", fontWeight: 600,
        cursor: isPending ? "not-allowed" : "pointer", whiteSpace: "nowrap",
      }}>{isPending ? "…" : "Approve"}</button>
    );
  }

  if (status === "APPROVED") {
    return (
      <button onClick={handleRelease} disabled={isPending} style={{
        padding: "0.25rem 0.65rem", borderRadius: "4px", background: "#1a56db",
        color: "#fff", border: "none", fontSize: "0.75rem", fontWeight: 600,
        cursor: isPending ? "not-allowed" : "pointer", whiteSpace: "nowrap",
      }}>{isPending ? "…" : "Release"}</button>
    );
  }

  return <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>—</span>;
}
