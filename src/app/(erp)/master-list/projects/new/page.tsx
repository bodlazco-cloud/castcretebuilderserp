export const dynamic = "force-dynamic";
import { db } from "@/db";
import { developers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { NewProjectForm } from "../NewProjectForm";

export default async function NewProjectPage() {
  await getAuthUser();
  const devOptions = await db
    .select({ id: developers.id, name: developers.name })
    .from(developers)
    .where(eq(developers.isActive, true))
    .orderBy(developers.name);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "680px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/projects" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Projects / Sites</a>
        </div>
        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, borderLeft: "4px solid #6366f1", paddingLeft: "0.75rem" }}>
            Add Project / Site
          </h1>
          <p style={{ margin: "0 0 0 1.25rem", color: "#6b7280", fontSize: "0.9rem" }}>
            Register a new project contract linked to a developer.
          </p>
        </header>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <NewProjectForm devOptions={devOptions} />
        </div>
      </div>
    </main>
  );
}
