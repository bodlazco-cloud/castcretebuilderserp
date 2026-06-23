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
          <p style={{ margin: "0 0 1.25rem", color: "#6b7280", fontSize: "0.9rem" }}>
            {error.message || "An unexpected error occurred."}
          </p>
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
