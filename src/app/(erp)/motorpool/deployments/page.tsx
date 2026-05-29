export const dynamic = "force-dynamic";

import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NewDeploymentForm, EndDeploymentButton } from "./DeploymentForm";

const ACCENT = "#1a56db";

export default async function DeploymentsPage() {
  const user = await getAuthUser();

  const [equipmentList, allDepts, projects, deployments] = await Promise.all([
    db.select({
      id:     schema.equipment.id,
      code:   schema.equipment.code,
      name:   schema.equipment.name,
      status: schema.equipment.status,
    }).from(schema.equipment).orderBy(schema.equipment.code),

    db.select({ id: schema.departments.id, code: schema.departments.code, name: schema.departments.name })
      .from(schema.departments).orderBy(schema.departments.code),

    db.select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects).orderBy(schema.projects.name),

    db.select({
      id:          schema.equipmentDeployments.id,
      status:      schema.equipmentDeployments.status,
      monthlyRate: schema.equipmentDeployments.monthlyRate,
      startDate:   schema.equipmentDeployments.startDate,
      endDate:     schema.equipmentDeployments.endDate,
      notes:       schema.equipmentDeployments.notes,
      equipCode:   schema.equipment.code,
      equipName:   schema.equipment.name,
      deptCode:    schema.departments.code,
      deptName:    schema.departments.name,
      projectName: schema.projects.name,
    })
      .from(schema.equipmentDeployments)
      .leftJoin(schema.equipment,    eq(schema.equipmentDeployments.equipmentId,      schema.equipment.id))
      .leftJoin(schema.departments,  eq(schema.equipmentDeployments.deployedToDeptId, schema.departments.id))
      .leftJoin(schema.projects,     eq(schema.equipmentDeployments.projectId,        schema.projects.id))
      .orderBy(desc(schema.equipmentDeployments.createdAt)),
  ]);

  const active = deployments.filter((d) => d.status === "ACTIVE");
  const ended  = deployments.filter((d) => d.status === "ENDED");
  const monthlyRecurring = active.reduce((s, d) => s + Number(d.monthlyRate), 0);

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>

      <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>← Fleet (Motorpool)</a>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>Equipment Deployments</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
              Assign machines to departments at a fixed monthly rate. Billing auto-posts on the 1st of each month.
            </p>
          </div>
          <NewDeploymentForm
            equipmentList={equipmentList}
            departments={allDepts}
            projects={projects}
            userId={user?.id ?? ""}
          />
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Active Deployments",   value: active.length.toString(),  sub: "machines currently deployed" },
            { label: "Monthly Recurring",    value: "₱" + monthlyRecurring.toLocaleString("en-PH", { minimumFractionDigits: 2 }), sub: "fixed rental revenue" },
            { label: "Total Deployments",    value: deployments.length.toString(), sub: "all time" },
          ].map((k) => (
            <div key={k.label} style={{
              background: "#fff", borderRadius: "8px", padding: "1rem 1.25rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${ACCENT}`,
            }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, fontFamily: "monospace" }}>{k.value}</div>
              <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.15rem" }}>{k.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Accounting note */}
        <div style={{
          marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "#eff6ff",
          border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "0.82rem", color: "#1e40af",
        }}>
          <strong>Auto-Billing:</strong> On the 1st of each month, the cron job at{" "}
          <code style={{ background: "#dbeafe", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>/api/cron/monthly-billing</code>{" "}
          posts two ledger entries per active deployment —{" "}
          Debit: receiving dept OUTFLOW · Credit: Motorpool INFLOW.
          Set <code style={{ background: "#dbeafe", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>CRON_SECRET</code> in Replit env vars and configure your cron service.
        </div>

        {/* Active deployments */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: "1.5rem" }}>
          <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #e5e7eb", borderTop: `3px solid ${ACCENT}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Active Deployments ({active.length})</h2>
          </div>
          {active.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
              No active deployments. Create one above.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Equipment", "Deployed To", "Project", "Monthly Rate", "Since", "Notes", ""].map((h, i) => (
                    <th key={h + i} style={{
                      padding: "0.6rem 0.85rem", textAlign: i === 3 ? "right" : "left",
                      fontSize: "0.72rem", fontWeight: 700, color: "#6b7280",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <span style={{ fontWeight: 600 }}>{d.equipCode}</span>
                      <span style={{ color: "#9ca3af" }}> — {d.equipName}</span>
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <span style={{ padding: "0.15rem 0.45rem", background: "#eff6ff", color: "#1e40af", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>
                        {d.deptCode}
                      </span>
                      <span style={{ marginLeft: "0.35rem", color: "#374151" }}>{d.deptName}</span>
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", color: "#6b7280" }}>{d.projectName ?? "—"}</td>
                    <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: ACCENT }}>
                      ₱{Number(d.monthlyRate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", color: "#6b7280", whiteSpace: "nowrap" }}>{d.startDate}</td>
                    <td style={{ padding: "0.65rem 0.85rem", color: "#9ca3af", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.notes ?? "—"}</td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <EndDeploymentButton deploymentId={d.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ended deployments */}
        {ended.length > 0 && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#6b7280" }}>Ended Deployments ({ended.length})</h2>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Equipment", "Deployed To", "Monthly Rate", "Period", "Notes"].map((h, i) => (
                    <th key={h} style={{ padding: "0.6rem 0.85rem", textAlign: i === 2 ? "right" : "left", fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ended.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: 0.7 }}>
                    <td style={{ padding: "0.65rem 0.85rem" }}>{d.equipCode} — {d.equipName}</td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>{d.deptCode} — {d.deptName}</td>
                    <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontFamily: "monospace" }}>
                      ₱{Number(d.monthlyRate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                      {d.startDate} → {d.endDate ?? "—"}
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", color: "#9ca3af" }}>{d.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
