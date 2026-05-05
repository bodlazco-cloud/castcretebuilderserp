export const dynamic = "force-dynamic";
import { db } from "@/db";
import { developerRateCards, activityDefinitions, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { EditRateCardForm } from "./EditRateCardForm";

const ACCENT = "#dc2626";
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function RateCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [card] = await db
    .select({
      id:              developerRateCards.id,
      projectId:       developerRateCards.projectId,
      activityDefId:   developerRateCards.activityDefId,
      grossRatePerUnit: developerRateCards.grossRatePerUnit,
      retentionPct:    developerRateCards.retentionPct,
      dpRecoupmentPct: developerRateCards.dpRecoupmentPct,
      taxPct:          developerRateCards.taxPct,
      version:         developerRateCards.version,
      isActive:        developerRateCards.isActive,
      projName:        projects.name,
      activityCode:    activityDefinitions.activityCode,
      activityName:    activityDefinitions.activityName,
      scopeName:       activityDefinitions.scopeName,
    })
    .from(developerRateCards)
    .leftJoin(projects,            eq(developerRateCards.projectId,   projects.id))
    .leftJoin(activityDefinitions, eq(developerRateCards.activityDefId, activityDefinitions.id))
    .where(eq(developerRateCards.id, id));

  if (!card) notFound();

  const allProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .orderBy(projects.name);

  const allActivities = await db
    .select({
      id:           activityDefinitions.id,
      activityCode: activityDefinitions.activityCode,
      activityName: activityDefinitions.activityName,
      scopeName:    activityDefinitions.scopeName,
    })
    .from(activityDefinitions)
    .where(eq(activityDefinitions.isActive, true))
    .orderBy(activityDefinitions.activityCode);

  const pct = (v: string | null) =>
    v != null ? `${(Number(v) * 100).toFixed(2)}%` : "—";
  const gross = Number(card.grossRatePerUnit);
  const ret   = gross * Number(card.retentionPct ?? 0);
  const dp    = gross * Number(card.dpRecoupmentPct ?? 0);
  const tax   = gross * Number(card.taxPct ?? 0);
  const net   = gross - ret - dp - tax;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "700px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin/rate-cards" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Developer Rate Cards</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>
              {card.activityCode ?? "—"}: {card.activityName ?? "Rate Card"}
            </h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#eff6ff", color: "#1e40af" }}>
                v{card.version}
              </span>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: card.isActive ? "#dcfce7" : "#f3f4f6", color: card.isActive ? "#166534" : "#6b7280" }}>
                {card.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.25rem" }}>
            <div><div style={LABEL}>Gross Rate/Unit</div><div style={VALUE}>PHP {gross.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div></div>
            <div><div style={LABEL}>Retention</div><div style={{ ...VALUE, color: "#b91c1c" }}>{pct(card.retentionPct)}</div></div>
            <div><div style={LABEL}>DP Recoupment</div><div style={{ ...VALUE, color: "#b91c1c" }}>{pct(card.dpRecoupmentPct)}</div></div>
            <div><div style={LABEL}>Tax</div><div style={{ ...VALUE, color: "#b91c1c" }}>{pct(card.taxPct)}</div></div>
          </div>
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6" }}>
            <div style={LABEL}>Net Rate / Unit</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#057a55", fontFamily: "monospace" }}>
              PHP {net.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <h2 style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Edit Rate Card</h2>
          <EditRateCardForm
            id={id}
            isActive={card.isActive}
            projects={allProjects}
            activities={allActivities}
            initial={{
              projectId:        card.projectId,
              activityDefId:    card.activityDefId,
              grossRatePerUnit: String(card.grossRatePerUnit),
              retentionPct:     String(card.retentionPct),
              dpRecoupmentPct:  String(card.dpRecoupmentPct),
              taxPct:           String(card.taxPct),
            }}
          />
        </div>
      </div>
    </main>
  );
}
