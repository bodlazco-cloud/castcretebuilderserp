import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { IssueNtpForm } from "./IssueNtpForm";

export default async function IssueNtpPage() {
  const user = await getAuthUser();

  const [projects, units, subcontractors] = await Promise.all([
    db.select({ id: schema.projects.id, name: schema.projects.name, status: schema.projects.status })
      .from(schema.projects)
      .orderBy(schema.projects.name),
    db.select({
      id: schema.projectUnits.id,
      unitCode: schema.projectUnits.unitCode,
      projectId: schema.projectUnits.projectId,
      unitModel: schema.projectUnits.unitModel,
    })
      .from(schema.projectUnits)
      .where(eq(schema.projectUnits.status, "PENDING"))
      .orderBy(schema.projectUnits.unitCode),
    db.select({
      id: schema.subcontractors.id,
      name: schema.subcontractors.name,
      code: schema.subcontractors.code,
      tradeTypes: schema.subcontractors.tradeTypes,
    })
      .from(schema.subcontractors)
      .where(eq(schema.subcontractors.isActive, true))
      .orderBy(schema.subcontractors.name),
  ]);

  const ACCENT = "#1a56db";

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "56px", background: "#fff",
        borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>

      <div style={{ padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>
            ← Back to Planning
          </a>
        </div>

        <div style={{
          background: "#fff", borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden",
        }}>
          <div style={{
            padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb",
            borderTop: `4px solid ${ACCENT}`,
          }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Issue Notice to Proceed (NTP)</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              BOD approval required before NTPs can be issued on a project.
            </p>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <IssueNtpForm
              projects={projects}
              units={units}
              subcontractors={subcontractors.map((s) => ({ ...s, tradeTypes: s.tradeTypes ?? [] }))}
              userId={user?.id ?? ""}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
