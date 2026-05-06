import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#dc2626";

export default async function GlobalSettingsPage() {
  await getAuthUser();

  const sections = [
    {
      title: "Company Information",
      desc:  "Legal name, address, TIN, and contact details printed on official documents.",
      fields: ["Company Name", "Legal Address", "TIN", "Contact Number", "Email"],
    },
    {
      title: "Fiscal Settings",
      desc:  "Define your fiscal year start month and default currency.",
      fields: ["Fiscal Year Start Month", "Default Currency", "VAT Rate (%)"],
    },
    {
      title: "Feature Flags",
      desc:  "Enable or disable modules and experimental features.",
      fields: ["Motorpool Module", "Batching Plant Module", "HR & Payroll Module"],
    },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "720px" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Global Settings</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>System-wide configuration for Castcrete 360.</p>
        </div>

        <div style={{
          padding: "1.25rem 1.5rem", background: "#fffbeb", border: "1px solid #fcd34d",
          borderRadius: "8px", marginBottom: "2rem", fontSize: "0.875rem", color: "#92400e",
        }}>
          Global Settings configuration UI is coming soon. Contact your system administrator to update these values directly in the database.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {sections.map((s) => (
            <div key={s.title} style={{
              background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              padding: "1.25rem 1.5rem",
            }}>
              <div style={{ fontWeight: 700, color: "#111827", marginBottom: "0.25rem" }}>{s.title}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "1rem" }}>{s.desc}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {s.fields.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "#374151", width: "200px", flexShrink: 0 }}>{f}</span>
                    <div style={{
                      flex: 1, height: "36px", background: "#f3f4f6",
                      borderRadius: "6px", border: "1px solid #e5e7eb",
                    }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
