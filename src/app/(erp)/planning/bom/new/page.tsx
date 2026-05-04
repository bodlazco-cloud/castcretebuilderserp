export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { BomEntryForm } from "../BomEntryForm";

export default async function NewBomEntryPage() {
  await getAuthUser();

  const [sowRows, materialRows, vendorRows] = await Promise.all([
    db.select({
        id:           schema.activityDefinitions.id,
        scopeName:    schema.activityDefinitions.scopeName,
        activityCode: schema.activityDefinitions.activityCode,
      })
      .from(schema.activityDefinitions)
      .where(eq(schema.activityDefinitions.isActive, true))
      .orderBy(schema.activityDefinitions.scopeName, schema.activityDefinitions.sequenceOrder),
    db.select({ id: schema.materials.id, code: schema.materials.code, name: schema.materials.name, unit: schema.materials.unit })
      .from(schema.materials)
      .where(eq(schema.materials.isActive, true))
      .orderBy(schema.materials.code),
    db.select({ id: schema.suppliers.id, name: schema.suppliers.name })
      .from(schema.suppliers)
      .where(eq(schema.suppliers.isActive, true))
      .orderBy(schema.suppliers.name),
  ]);

  const ACCENT = "#1a56db";

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning/bom" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← BOM Register</a>
        </div>

        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
            New BOM Entry
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            Define material quantities per scope of work, unit model, and unit type. Existing entries are versioned out automatically.
          </p>
        </header>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <BomEntryForm
            sowItems={sowRows}
            materials={materialRows}
            vendors={vendorRows}
          />
        </div>
      </div>
    </main>
  );
}
