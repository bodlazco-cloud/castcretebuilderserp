export const dynamic = "force-dynamic";
import { db } from "@/db";
import { developers, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

export default async function DeveloperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [dev] = await db
    .select()
    .from(developers)
    .where(eq(developers.id, id));

  if (!dev) notFound();

  const projectRows = await db
    .select({ id: projects.id, name: projects.name, status: projects.status, contractValue: projects.contractValue, startDate: projects.startDate })
    .from(projects)
    .where(eq(projects.developerId, id))
    .orderBy(projects.name);

  const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" };
  const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

  const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
    ACTIVE:    { bg: "#dcfce7", color: "#166534" },
    BIDDING:   { bg: "#eff6ff", color: "#1e40af" },
    ON_HOLD:   { bg: "#fef9c3", color: "#713f12" },
    COMPLETED: { bg: "#f0fdf4", color: "#166534" },
    CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/developers" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Developers</a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{dev.name}</h1>
            <span style={{
              display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
              background: dev.isActive ? "#dcfce7" : "#f3f4f6", color: dev.isActive ? "#166534" : "#6b7280",
            }}>{dev.isActive ? "Active" : "Inactive"}</span>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div><div style={LABEL}>Developer ID</div><div style={{ ...VALUE, fontFamily: "monospace", fontSize: "0.8rem" }}>{dev.id}</div></div>
            <div><div style={LABEL}>Added</div><div style={VALUE}>{new Date(dev.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div></div>
          </div>
        </div>

        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
          Linked Projects ({projectRows.length})
        </h2>
        {projectRows.length === 0 ? (
          <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
            No projects linked to this developer yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Project", "Status", "Contract Value", "Start Date", ""].map((h, i) => (
                    <th key={i} style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projectRows.map((p) => {
                  const sc = STATUS_COLOR[p.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#111827" }}>{p.name}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ display: "inline-block", padding: "0.15rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: sc.bg, color: sc.color }}>{p.status}</span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>
                        PHP {Number(p.contractValue).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{p.startDate ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                        <a href={`/master-list/projects/${p.id}`} style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
