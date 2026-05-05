export const dynamic = "force-dynamic";
import { db } from "@/db";
import { activityDefinitions, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { BomStandardForm } from "../BomStandardForm";

export default async function NewBomStandardPage() {
  await getAuthUser();

  const [activityRows, materialRows] = await Promise.all([
    db.select({ id: activityDefinitions.id, activityCode: activityDefinitions.activityCode, activityName: activityDefinitions.activityName })
      .from(activityDefinitions).where(eq(activityDefinitions.isActive, true)).orderBy(activityDefinitions.activityCode),
    db.select({ id: materials.id, code: materials.code, name: materials.name, unit: materials.unit })
      .from(materials).where(eq(materials.isActive, true)).orderBy(materials.code),
  ]);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "700px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/bom-standards" style={{ fontSize: "0.8rem", color: "#dc2626", textDecoration: "none" }}>← BOM Standards</a>
        </div>
        <h1 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>New BOM Standard Line</h1>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <BomStandardForm
            mode="create"
            activities={activityRows.map((a) => ({ id: String(a.id), activityCode: String(a.activityCode), activityName: String(a.activityName) }))}
            materials={materialRows.map((m) => ({ id: String(m.id), code: String(m.code), name: String(m.name), unit: String(m.unit) }))}
          />
        </div>
      </div>
    </main>
  );
}
