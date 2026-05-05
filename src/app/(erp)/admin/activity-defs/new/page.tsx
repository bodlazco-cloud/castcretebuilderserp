export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { ActivityDefForm } from "../ActivityDefForm";

export default async function NewActivityDefPage() {
  await getAuthUser();
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "700px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/activity-defs" style={{ fontSize: "0.8rem", color: "#dc2626", textDecoration: "none" }}>← Scope of Work</a>
        </div>
        <h1 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>New Activity Definition</h1>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <ActivityDefForm mode="create" />
        </div>
      </div>
    </main>
  );
}
