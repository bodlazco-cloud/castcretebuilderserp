const ACCENT = "#1a56db";

export default function ExpensePage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Finance & Accounting
          </a>
        </div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
          Expense
        </h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
          Petty cash, reimbursements, and miscellaneous operational expenses — mapped to project cost centres for P&L accuracy.
        </p>

        {/* Attachment rule callout */}
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e40af", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Attachment Rule
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#1d4ed8", lineHeight: 1.6 }}>
            A receipt or photo attachment is mandatory before any expense can be submitted for approval. Expenses above ₱50,000 require dual authorisation from BOD / Head of Finance.
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>💳</div>
          <p style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "0.5rem", fontWeight: 600 }}>
            Module Under Development
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", maxWidth: "480px", margin: "0 auto" }}>
            The Expense module will handle petty cash liquidations, employee reimbursements, and operational spend — with mandatory receipt uploads and cost centre mapping to ensure accurate real-time P&L per project.
          </p>
        </div>
      </div>
    </main>
  );
}
