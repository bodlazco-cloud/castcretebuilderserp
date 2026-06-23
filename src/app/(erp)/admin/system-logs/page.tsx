export const dynamic = "force-dynamic";
import { db } from "@/db";
import { adminSettings, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const ACCENT = "#374151";

export default async function SystemLogsPage() {
  const rows = await db
    .select({
      id: adminSettings.id,
      settingKey: adminSettings.settingKey,
      isActive: adminSettings.isActive,
      approvedAt: adminSettings.approvedAt,
      createdAt: adminSettings.createdAt,
      projectName: projects.name,
    })
    .from(adminSettings)
    .leftJoin(projects, eq(adminSettings.projectId, projects.id))
    .orderBy(desc(adminSettings.createdAt))
    .limit(100);

  const total = rows.length;
  const active = rows.filter((r) => r.isActive).length;
  const approved = rows.filter((r) => r.approvedAt !== null).length;

  const kpis = [
    { label: "Total Settings Records", value: total },
    { label: "Active", value: active },
    { label: "Approved", value: approved },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Admin</a>
        </div>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>System Logs</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Admin settings changes and configuration audit trail.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem" }}>
              <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827" }}>{k.value}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.9rem" }}>
            No admin settings records found.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "700px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Setting Key", "Project", "Status", "Approved", "Created"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 600, color: "#111827", fontFamily: "monospace", fontSize: "0.82rem" }}>{r.settingKey}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151", fontSize: "0.85rem" }}>
                        {r.projectName ?? <span style={{ color: "#9ca3af" }}>—</span>}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "999px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          background: r.isActive ? "#f0fdf4" : "#f3f4f6",
                          color: r.isActive ? "#057a55" : "#9ca3af",
                        }}>
                          {r.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>
                        {r.approvedAt ? new Date(r.approvedAt).toLocaleDateString("en-PH") : <span style={{ color: "#9ca3af" }}>—</span>}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>
                        {new Date(r.createdAt).toLocaleDateString("en-PH")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
