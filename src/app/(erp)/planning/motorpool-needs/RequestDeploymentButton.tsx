"use client";

import { useState } from "react";
import { updateForecastStatus } from "@/actions/planning";
import { useRouter } from "next/navigation";

export function RequestDeploymentButton({ forecastId }: { forecastId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleRequest() {
    setState("loading");
    setErrorMsg(null);
    try {
      const result = await updateForecastStatus(forecastId, "PR_CREATED");
      if (result.success) {
        setState("done");
        router.refresh();
      } else {
        setErrorMsg(result.error ?? "Failed.");
        setState("error");
      }
    } catch {
      setErrorMsg("Unexpected error.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <a href="/motorpool/deployments" style={{ color: "#057a55", fontWeight: 600, fontSize: "0.78rem", textDecoration: "none" }}>
        ✓ Requested →
      </a>
    );
  }

  if (state === "error") {
    return <span style={{ color: "#b91c1c", fontSize: "0.72rem" }}>{errorMsg}</span>;
  }

  return (
    <button
      onClick={handleRequest}
      disabled={state === "loading"}
      style={{
        padding: "0.3rem 0.65rem",
        background: state === "loading" ? "#e5e7eb" : "#0694a2",
        color: state === "loading" ? "#9ca3af" : "#fff",
        border: "none", borderRadius: "6px",
        fontSize: "0.75rem", fontWeight: 600,
        cursor: state === "loading" ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {state === "loading" ? "Requesting…" : "Request Deployment"}
    </button>
  );
}
