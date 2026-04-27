export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  return (
    <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
      <div style={{ background: "#fff", padding: "2.5rem", borderRadius: "8px", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", width: "100%", maxWidth: "380px" }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700 }}>Castcrete 360</h1>
        <p style={{ margin: "0 0 2rem", color: "#666", fontSize: "0.9rem" }}>Sign in to your account</p>
        <form method="POST" action="/auth/login">
          <label style={{ display: "block", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Email</span>
            <input
              name="email"
              type="email"
              required
              style={{ display: "block", width: "100%", marginTop: "0.25rem", padding: "0.6rem 0.75rem", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.95rem", boxSizing: "border-box" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Password</span>
            <input
              name="password"
              type="password"
              required
              style={{ display: "block", width: "100%", marginTop: "0.25rem", padding: "0.6rem 0.75rem", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.95rem", boxSizing: "border-box" }}
            />
          </label>
          <button
            type="submit"
            style={{ width: "100%", padding: "0.7rem", background: "#1a56db", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" }}
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}
