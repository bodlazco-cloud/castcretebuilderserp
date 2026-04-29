export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { LogBatchForm } from "./LogBatchForm";

export default async function LogBatchPage() {
  const user = await getAuthUser();

  const [projects, mixDesigns] = await Promise.all([
    db.select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects).orderBy(schema.projects.name),
    db.select({ id: schema.mixDesigns.id, code: schema.mixDesigns.code, name: schema.mixDesigns.name })
      .from(schema.mixDesigns).where(eq(schema.mixDesigns.isActive, true)).orderBy(schema.mixDesigns.code),
  ]);

  const ACCENT = "#7c3aed";

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>
      <div style={{ padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>← Back to Batching</a>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: `4px solid ${ACCENT}` }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Log Batch Production</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              Yield variance &gt;2% vs. mix design will auto-flag to Audit.
            </p>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <LogBatchForm projects={projects} mixDesigns={mixDesigns} userId={user?.id ?? ""} />
          </div>
        </div>
      </div>
    </main>
  );
}
