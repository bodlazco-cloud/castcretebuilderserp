export default function ComingSoon({ title, section }: { title: string; section?: string }) {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "700px", margin: "4rem auto", textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "64px", height: "64px", borderRadius: "16px",
          background: "#eff6ff", marginBottom: "1.5rem",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: "0 0 0.5rem" }}>{title}</h1>
        {section && (
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0 0 1rem" }}>{section}</p>
        )}
        <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: 0 }}>
          This page is under construction and will be available in a future release.
        </p>
      </div>
    </main>
  );
}
