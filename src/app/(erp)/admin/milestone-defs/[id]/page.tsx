export const dynamic = "force-dynamic";
import { db } from "@/db";
import { milestoneDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { MilestoneDefForm } from "../MilestoneDefForm";
import { MilestoneToggle } from "./MilestoneToggle";

const ACCENT = "#7e3af2";
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function MilestoneDefDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [ms] = await db
    .select()
    .from(milestoneDefinitions)
    .where(eq(milestoneDefinitions.id, id));

  if (!ms) notFound();

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "700px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/milestone-defs" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Milestone Definitions</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>{ms.name}</h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#eff6ff", color: "#1e40af" }}>
                {ms.category}
              </span>
              {ms.triggersBilling && (
                <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#fef9c3", color: "#713f12" }}>
                  BILLING
                </span>
              )}
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: ms.isActive ? "#dcfce7" : "#f3f4f6", color: ms.isActive ? "#166534" : "#6b7280" }}>
                {ms.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <MilestoneToggle id={id} isActive={ms.isActive} />
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div><div style={LABEL}>Sequence</div><div style={VALUE}>#{ms.sequenceOrder}</div></div>
            <div><div style={LABEL}>Weight</div><div style={VALUE}>{Number(ms.weightPct).toFixed(2)}%</div></div>
            <div><div style={LABEL}>Billing Trigger</div><div style={VALUE}>{ms.triggersBilling ? "Yes" : "No"}</div></div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <h2 style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Edit Milestone</h2>
          <MilestoneDefForm
            mode="edit"
            id={id}
            initial={{
              name:            ms.name,
              category:        ms.category,
              sequenceOrder:   ms.sequenceOrder,
              triggersBilling: ms.triggersBilling,
              weightPct:       String(ms.weightPct),
            }}
          />
        </div>
      </div>
    </main>
  );
}
