"use client";

import { useEffect } from "react";

export default function AssignEquipmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Motorpool assign error:", error);
  }, [error]);

  const allProps = Object.getOwnPropertyNames(error).map((k) => {
    try { return `${k}: ${String((error as Record<string, unknown>)[k])}`; } catch { return `${k}: [unreadable]`; }
  });

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.875rem", color: "#1a56db", textDecoration: "none" }}>
            ← Back to Motorpool
          </a>
        </div>
        <div style={{
          background: "#fff", borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "2rem",
        }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>
            Something went wrong loading this page
          </h2>
          <pre style={{ margin: "0 0 1rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", padding: "1rem", whiteSpace: "pre-wrap", fontSize: "0.75rem", color: "#b91c1c" }}>
            {`name: ${error.name}\nmessage: ${error.message}\ndigest: ${error.digest ?? "(none)"}\n\n--- all props ---\n${allProps.join("\n")}\n\n--- stack ---\n${error.stack ?? "(none)"}`}
          </pre>
          <button
            onClick={reset}
            style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px",
              background: "#0694a2", color: "#fff", border: "none",
              fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
