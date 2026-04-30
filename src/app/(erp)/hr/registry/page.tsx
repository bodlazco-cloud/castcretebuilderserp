export default function EmployeeRegistryPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/hr" style={{ fontSize: "0.8rem", color: "#6b7280", textDecoration: "none" }}>← HR & Payroll</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Employee Registry</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Full employee master list, positions, and status.</p>
          </div>
          <a href="/hr/add-employee" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#4b5563",
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Add Employee</a>
        </div>
        <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
          Module under construction
        </div>
      </div>
    </main>
  );
}
