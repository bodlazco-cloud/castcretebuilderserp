export const dynamic = "force-dynamic";
import { db } from "@/db";
import { subconRateCards, subcontractors, projects, activityDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { EditSubconRateCardForm } from "./EditSubconRateCardForm";

const ACCENT = "#6366f1";

export default async function SubconRateCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [card] = await db
    .select({
      id:           subconRateCards.id,
      subconId:     subconRateCards.subconId,
      projectId:    subconRateCards.projectId,
      activityDefId: subconRateCards.activityDefId,
      ratePerUnit:  subconRateCards.ratePerUnit,
      retentionPct: subconRateCards.retentionPct,
      version:      subconRateCards.version,
      isActive:     subconRateCards.isActive,
      subconName:   subcontractors.name,
      projName:     projects.name,
      actCode:      activityDefinitions.activityCode,
      actName:      activityDefinitions.activityName,
    })
    .from(subconRateCards)
    .leftJoin(subcontractors,      eq(subconRateCards.subconId,      subcontractors.id))
    .leftJoin(projects,            eq(subconRateCards.projectId,     projects.id))
    .leftJoin(activityDefinitions, eq(subconRateCards.activityDefId, activityDefinitions.id))
    .where(eq(subconRateCards.id, id));

  if (!card) notFound();

  const [subconList, projectList, activityList] = await Promise.all([
    db.select({ id: subcontractors.id, name: subcontractors.name, code: subcontractors.code })
      .from(subcontractors).where(eq(subcontractors.isActive, true)).orderBy(subcontractors.name),
    db.select({ id: projects.id, name: projects.name })
      .from(projects).orderBy(projects.name),
    db.select({ id: activityDefinitions.id, activityCode: activityDefinitions.activityCode, activityName: activityDefinitions.activityName, scopeName: activityDefinitions.scopeName })
      .from(activityDefinitions).where(eq(activityDefinitions.isActive, true)).orderBy(activityDefinitions.activityCode),
  ]);

  const rate = Number(card.ratePerUnit);
  const ret  = rate * Number(card.retentionPct ?? 0);
  const net  = rate - ret;
  const fmt  = (v: number) => `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "800px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/subcon-rate-cards" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Subcontractor Rate Cards</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
            {card.subconName ?? "—"} — {card.actCode ?? "—"}
          </h1>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#f3f4f6", color: "#374151" }}>{card.projName ?? "No project"}</span>
            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: card.isActive ? "#f0fdf4" : "#f3f4f6", color: card.isActive ? "#057a55" : "#9ca3af" }}>{card.isActive ? "ACTIVE" : "INACTIVE"}</span>
            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#f3f4f6", color: "#374151" }}>v{card.version}</span>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Rate / Unit", value: fmt(rate), color: "#111827" },
            { label: `Retention (${(Number(card.retentionPct ?? 0) * 100).toFixed(2)}%)`, value: `−${fmt(ret)}`, color: "#b91c1c" },
            { label: "Net Rate", value: fmt(net), color: "#057a55" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1rem 1.25rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.25rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: kpi.color, fontFamily: "monospace" }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Edit Rate Card</h2>
          <EditSubconRateCardForm
            id={String(card.id)}
            isActive={Boolean(card.isActive)}
            initial={{
              subconId:      String(card.subconId),
              projectId:     String(card.projectId),
              activityDefId: String(card.activityDefId),
              ratePerUnit:   String(card.ratePerUnit),
              retentionPct:  String((Number(card.retentionPct ?? 0) * 100).toFixed(4)),
            }}
            subcontractors={subconList.map((s) => ({ id: String(s.id), name: String(s.name), code: String(s.code) }))}
            projects={projectList.map((p) => ({ id: String(p.id), name: String(p.name) }))}
            activities={activityList.map((a) => ({ id: String(a.id), activityCode: String(a.activityCode), activityName: String(a.activityName), scopeName: String(a.scopeName) }))}
          />
        </div>
      </div>
    </main>
  );
}
