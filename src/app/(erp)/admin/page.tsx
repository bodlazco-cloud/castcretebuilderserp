export default function AdminPage() {
  const items = [
    { label: "User Management", href: "/admin/users", desc: "Add, disable, and assign roles to system users" },
  ];
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Administration</h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem" }}>
          System configuration and user access management. Admin access only.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {items.map((item) => (
            <a key={item.href} href={item.href} style={{
              display: "block", padding: "1.25rem 1.5rem",
              background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              textDecoration: "none", borderLeft: "4px solid #dc2626",
            }}>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.25rem" }}>{item.label}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{item.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
