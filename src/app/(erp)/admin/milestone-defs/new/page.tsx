export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { MilestoneDefForm } from "../MilestoneDefForm";

const ACCENT = "#7e3af2";

export default async function NewMilestoneDefPage() {
  await getAuthUser();

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "640px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/milestone-defs" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Milestone Definitions</a>
        </div>
        <header style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            New Milestone Definition
          </h1>
          <p style={{ margin: "0 0 0 1.25rem", color: "#6b7280", fontSize: "0.9rem" }}>
            Define a reusable milestone with its category and billing trigger.
          </p>
        </header>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <MilestoneDefForm mode="create" />
        </div>
      </div>
    </main>
  );
}
