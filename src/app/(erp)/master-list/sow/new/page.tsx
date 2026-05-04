export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { Suspense } from "react";
import { NewSowForm } from "../NewSowForm";

export default async function NewSowPage() {
  await getAuthUser();

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "720px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/sow" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Scope of Work</a>
        </div>
        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, borderLeft: "4px solid #6366f1", paddingLeft: "0.75rem" }}>
            Add Scope Item
          </h1>
          <p style={{ margin: "0 0 0 1.25rem", color: "#6b7280", fontSize: "0.9rem" }}>
            Define a reusable activity. Attach it to a project by adding BOM entries under Planning.
          </p>
        </header>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <Suspense>
            <NewSowForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
