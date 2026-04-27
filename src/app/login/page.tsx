const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials:  "Incorrect email or password.",
  missing_fields:       "Please enter your email and password.",
  auth_callback_failed: "Authentication failed. Please try again.",
  unauthorized:         "You don't have permission to access that page.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const { error, redirectTo } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "An error occurred. Please try again.") : null;

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
        {/* Logo / title */}
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.6rem", fontWeight: 700, color: "#111" }}>
            Castcrete 360
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            Sign in to your account
          </p>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div style={{
            marginBottom: "1.25rem", padding: "0.75rem 1rem",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem",
          }}>
            {errorMessage}
          </div>
        )}

        <form method="POST" action="/auth/login">
          {redirectTo && (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          )}

          <label style={{ display: "block", marginBottom: "1rem" }}>
            <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.35rem", color: "#374151" }}>
              Email address
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              style={{
                display: "block", width: "100%", padding: "0.65rem 0.85rem",
                border: "1px solid #d1d5db", borderRadius: "6px",
                fontSize: "0.95rem", boxSizing: "border-box", outline: "none",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "1.75rem" }}>
            <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.35rem", color: "#374151" }}>
              Password
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              style={{
                display: "block", width: "100%", padding: "0.65rem 0.85rem",
                border: "1px solid #d1d5db", borderRadius: "6px",
                fontSize: "0.95rem", boxSizing: "border-box", outline: "none",
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              width: "100%", padding: "0.75rem",
              background: "#1a56db", color: "#fff",
              border: "none", borderRadius: "6px",
              fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}
