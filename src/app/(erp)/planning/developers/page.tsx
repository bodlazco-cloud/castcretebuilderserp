export const dynamic = "force-dynamic";

import { db } from "@/db";
import { developers, projects } from "@/db/schema";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
    ]);
  } catch {
    return fallback;
  }
}

const php = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const fmtMonth = (d: Date | string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

export default async function PlanningDevelopersPage() {
  const [devRows, projectRows] = await Promise.all([
    safe(
      () =>
        db
          .select({
            id: developers.id,
            name: developers.name,
            isActive: developers.isActive,
            createdAt: developers.createdAt,
          })
          .from(developers)
          .orderBy(developers.name),
      []
    ),
    safe(
      () =>
        db
          .select({
            developerId: projects.developerId,
            id: projects.id,
            name: projects.name,
            status: projects.status,
            contractValue: projects.contractValue,
          })
          .from(projects),
      []
    ),
  ]);

  const projectsByDev = new Map<string, typeof projectRows>();
  for (const p of projectRows) {
    if (!projectsByDev.has(p.developerId)) projectsByDev.set(p.developerId, []);
    projectsByDev.get(p.developerId)!.push(p);
  }

  const totalDevelopers = devRows.length;
  const activeDevelopers = devRows.filter((d) => d.isActive).length;
  const totalProjects = projectRows.length;

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <a href="/planning" style={{ fontSize: "13px", color: "#1a56db", textDecoration: "none", fontWeight: 500 }}>
            ← Planning & Engineering
          </a>
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: "26px", fontWeight: 700, color: "#111827" }}>Developers</h1>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#6b7280" }}>
          Developer master list linked to project contracts.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "4px solid #1a56db" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Total Developers</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1a56db" }}>{totalDevelopers}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "4px solid #057a55" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Active</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#057a55" }}>{activeDevelopers}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "4px solid #7e3af2" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Total Projects</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#7e3af2" }}>{totalProjects}</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#111827" }}>Developer List</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Developer</th>
                  <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Active</th>
                  <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Projects</th>
                  <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Active Projects</th>
                  <th style={{ padding: "11px 16px", textAlign: "right", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Total Contract Value</th>
                  <th style={{ padding: "11px 16px", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>Member Since</th>
                </tr>
              </thead>
              <tbody>
                {devRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
                      No developers found.
                    </td>
                  </tr>
                ) : (
                  devRows.map((dev, i) => {
                    const devProjects = projectsByDev.get(dev.id) ?? [];
                    const activeProjects = devProjects.filter((p) => p.status === "ACTIVE").length;
                    const totalContractValue = devProjects.reduce((s, p) => s + Number(p.contractValue ?? 0), 0);
                    return (
                      <tr key={dev.id} style={{ borderBottom: i < devRows.length - 1 ? "1px solid #f3f4f6" : "none", verticalAlign: "middle" }}>
                        <td style={{ padding: "13px 16px", fontWeight: 700, color: "#111827" }}>{dev.name}</td>
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: dev.isActive ? "#dcfce7" : "#f3f4f6", color: dev.isActive ? "#166534" : "#6b7280" }}>
                            {dev.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          {devProjects.length > 0 ? (
                            <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, background: "#dbeafe", color: "#1e40af" }}>
                              {devProjects.length}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "13px 16px", color: "#374151" }}>{activeProjects}</td>
                        <td style={{ padding: "13px 16px", textAlign: "right", color: "#374151" }}>
                          {totalContractValue > 0 ? php(totalContractValue) : "—"}
                        </td>
                        <td style={{ padding: "13px 16px", color: "#6b7280" }}>{fmtMonth(dev.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
