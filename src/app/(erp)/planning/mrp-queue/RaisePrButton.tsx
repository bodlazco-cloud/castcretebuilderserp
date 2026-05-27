"use client";

import { useState } from "react";
import { raiseMrpPurchaseRequisition } from "@/actions/planning";
import { useRouter } from "next/navigation";

export function RaisePrButton({ forecastId }: { forecastId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [prId, setPrId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleRaise() {
    setState("loading");
    setErrorMsg(null);
    try {
      const result = await raiseMrpPurchaseRequisition(forecastId);
      if (result.success) {
        setPrId(result.prId);
        setState("done");
        router.refresh();
      } else {
        setErrorMsg(result.error);
        setState("error");
      }
    } catch {
      setErrorMsg("Unexpected error. Please try again.");
      setState("error");
    }
  }

  if (state === "done" && prId) {
    return (
      <a
        href={`/procurement/purchase-requisitions/${prId}`}
        style={{
          color: "#057a55",
          fontWeight: 600,
          fontSize: "0.78rem",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
        }}
      >
        ✓ PR Raised →
      </a>
    );
  }

  if (state === "error") {
    return (
      <span style={{ color: "#b91c1c", fontSize: "0.72rem", maxWidth: "120px", display: "inline-block" }}>
        {errorMsg ?? "Error"}
      </span>
    );
  }

  return (
    <button
      onClick={handleRaise}
      disabled={state === "loading"}
      style={{
        padding: "0.3rem 0.65rem",
        background: state === "loading" ? "#e5e7eb" : "#1a56db",
        color: state === "loading" ? "#9ca3af" : "#fff",
        border: "none",
        borderRadius: "6px",
        fontSize: "0.75rem",
        fontWeight: 600,
        cursor: state === "loading" ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "background 0.15s",
      }}
    >
      {state === "loading" ? "Raising…" : "Raise PR"}
    </button>
  );
}
