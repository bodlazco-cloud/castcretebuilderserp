import { NewDeveloperForm } from "../NewDeveloperForm";

export default function NewDeveloperPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "560px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/developers" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Developers</a>
        </div>
        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, borderLeft: "4px solid #6366f1", paddingLeft: "0.75rem" }}>
            Add Developer
          </h1>
          <p style={{ margin: "0 0 0 1.25rem", color: "#6b7280", fontSize: "0.9rem" }}>
            Register a new developer to link to project contracts.
          </p>
        </header>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <NewDeveloperForm />
        </div>
      </div>
    </main>
  );
}
