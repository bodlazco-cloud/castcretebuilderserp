export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { ImportHub } from "./ImportHub";

export default async function ImportPage() {
  await getAuthUser();
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Master List</a>
        </div>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Import Data</h1>
        <p style={{ margin: "0 0 2rem", fontSize: "0.875rem", color: "#6b7280" }}>
          Upload a CSV or Excel file (.xlsx) to bulk-import records. Download a sample template first to see the required column format.
        </p>
        <ImportHub />
      </div>
    </main>
  );
}
