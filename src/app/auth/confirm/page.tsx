"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const hash = window.location.hash.slice(1); // strip leading #
    const params = new URLSearchParams(hash);

    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type         = params.get("type"); // "invite" | "recovery" | "signup"

    if (!accessToken || !refreshToken) {
      setErrorMsg("Invalid or expired link. Please request a new one.");
      setStatus("error");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setErrorMsg(error.message);
          setStatus("error");
          return;
        }

        // For invite links the user must set a password — send to update-password page.
        // For other types (recovery, signup) go straight to dashboard.
        if (type === "invite" || type === "recovery") {
          router.replace("/auth/update-password");
        } else {
          router.replace("/dashboard");
        }
      });
  }, [router]);

  if (status === "error") {
    return (
      <main style={{
        display: "flex", minHeight: "100vh",
        alignItems: "center", justifyContent: "center",
        background: "#f0f2f5",
      }}>
        <div style={{
          background: "#fff", padding: "2.5rem",
          borderRadius: "10px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          maxWidth: "400px", width: "100%", textAlign: "center",
        }}>
          <p style={{ color: "#b91c1c", marginBottom: "1.5rem" }}>{errorMsg}</p>
          <a href="/login" style={{ color: "#1a56db", fontSize: "0.9rem" }}>Back to login</a>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      display: "flex", minHeight: "100vh",
      alignItems: "center", justifyContent: "center",
      background: "#f0f2f5",
    }}>
      <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>Signing you in…</p>
    </main>
  );
}
