export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { BomEntryForm } from "./BomEntryForm";

export default async function BomEntryPage() {
  await getAuthUser();

  const [projectRows, activityRows, materialRows] = await Promise.all([
    db.select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects)
      .orderBy(schema.projects.name),
    db.select({
        id:           schema.activityDefinitions.id,
        projectId:    schema.activityDefinitions.projectId,
        scopeName:    schema.activityDefinitions.scopeName,
        activityName: schema.activityDefinitions.activityName,
        activityCode: schema.activityDefinitions.activityCode,
      })
      .from(schema.activityDefinitions)
      .where(eq(schema.activityDefinitions.isActive, true))
      .orderBy(schema.activityDefinitions.scopeName, schema.activityDefinitions.sequenceOrder),
    db.select({ id: schema.materials.id, code: schema.materials.code, name: schema.materials.name, unit: schema.materials.unit })
      .from(schema.materials)
      .where(eq(schema.materials.isActive, true))
      .orderBy(schema.materials.code),
  ]);

  const ACCENT = "#1a56db";

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <nav style={{
        display: "flex", alignItems: "center",
        padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>

      <div style={{ padding: "2rem", maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning" style={{ fontSize: "0.875rem", color: "#1a56db", textDecoration: "none" }}>
            ← Back to Planning
          </a>
        </div>

        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{
            margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700,
            borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem",
          }}>
            Bill of Materials Entry
          </h1>
          <p style={{ margin: "0 0 0 1.25rem", color: "#6b7280", fontSize: "0.9rem" }}>
            Define material quantities per activity, unit model, and unit type. Existing entries for the same scope are versioned out automatically.
          </p>
        </header>

        <div style={{
          background: "#fff", borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem",
        }}>
          <BomEntryForm
            projects={projectRows}
            activities={activityRows}
            materials={materialRows}
          />
        </div>
      </div>
    </main>
  );
}
