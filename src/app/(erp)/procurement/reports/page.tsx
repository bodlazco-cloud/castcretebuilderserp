export default function ProcurementReportsPage() {
  const cards = [
    {
      href: "/procurement/reports/stock-level-analysis",
      icon: "📦",
      title: "Stock Level Analysis",
      desc: "Current inventory levels vs minimums",
    },
    {
      href: "/procurement/pr-po",
      icon: "📋",
      title: "PR / PO Management",
      desc: "Purchase requisitions and orders",
    },
    {
      href: "/procurement/receipts",
      icon: "🧾",
      title: "Material Receiving Reports",
      desc: "Delivery receipts and GRN records",
    },
    {
      href: "/procurement/logistics",
      icon: "🚚",
      title: "Logistics",
      desc: "Material transfers and deliveries",
    },
  ];

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <a href="/procurement" style={{ fontSize: "13px", color: "#e3a008", textDecoration: "none", fontWeight: 500 }}>
            ← Procurement & Stock
          </a>
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: "26px", fontWeight: 700, color: "#111827" }}>Procurement Reports</h1>
        <p style={{ margin: "0 0 32px", fontSize: "14px", color: "#6b7280" }}>
          Reports and analytics for the Procurement & Stock department
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {cards.map((card) => (
            <a
              key={card.href}
              href={card.href}
              style={{ textDecoration: "none", display: "flex", flexDirection: "column", background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "24px", minHeight: "140px", border: "1px solid #f3f4f6", position: "relative" }}
            >
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>{card.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#111827", marginBottom: "6px" }}>{card.title}</div>
              <div style={{ fontSize: "13px", color: "#6b7280", flex: 1 }}>{card.desc}</div>
              <div style={{ textAlign: "right", color: "#e3a008", fontSize: "18px", marginTop: "16px" }}>→</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
