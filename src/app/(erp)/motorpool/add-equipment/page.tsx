import { AddEquipmentForm } from "./AddEquipmentForm";

export default function AddEquipmentPage() {
  const ACCENT = "#d97706";
  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>
      <div style={{ padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>← Back to Motorpool</a>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: `4px solid ${ACCENT}` }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Add New Equipment</h1>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <AddEquipmentForm />
          </div>
        </div>
      </div>
    </main>
  );
}
