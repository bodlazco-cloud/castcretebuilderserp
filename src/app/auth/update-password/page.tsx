"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main style={{
      display: "flex", minHeight: "100vh",
      alignItems: "center", justifyContent: "center",
      background: "#f0f2f5",
    }}>
      <div style={{
        background: "#fff", padding: "2.5rem",
        borderRadius: "10px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        width: "100%", maxWidth: "400px",
      }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, color: "#111" }}>
          Set your password
        </h1>
        <p style={{ margin: "0 0 1.75rem", color: "#6b7280", fontSize: "0.875rem" }}>
          Choose a password to complete your account setup.
        </p>

        {error && (
          <div style={{
            marginBottom: "1.25rem", padding: "0.75rem 1rem",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: "1rem" }}>
            <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.35rem", color: "#374151" }}>
              New password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                display: "block", width: "100%", padding: "0.65rem 0.85rem",
                border: "1px solid #d1d5db", borderRadius: "6px",
                fontSize: "0.95rem", boxSizing: "border-box",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "1.75rem" }}>
            <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.35rem", color: "#374151" }}>
              Confirm password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{
                display: "block", width: "100%", padding: "0.65rem 0.85rem",
                border: "1px solid #d1d5db", borderRadius: "6px",
                fontSize: "0.95rem", boxSizing: "border-box",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "0.75rem",
              background: loading ? "#93c5fd" : "#1a56db", color: "#fff",
              border: "none", borderRadius: "6px",
              fontSize: "0.95rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Saving…" : "Set Password & Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
