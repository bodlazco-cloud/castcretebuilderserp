export const dynamic = "force-dynamic";
import { db } from "@/db";
import { users, materials, suppliers, activityDefinitions, milestoneDefinitions, bomStandards, developerRateCards } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#dc2626";

export default async function AdminPage() {
  await getAuthUser();

  const [
    userCount, activeUsers,
    matCount, activeMats,
    supplierCount, activeSuppliers,
    actCount, activeDefs,
    milestoneCount, bomCount, rateCount,
  ] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(users).where(eq(users.isActive, true)),
    db.select({ n: count() }).from(materials),
    db.select({ n: count() }).from(materials).where(eq(materials.isActive, true)),
    db.select({ n: count() }).from(suppliers),
    db.select({ n: count() }).from(suppliers).where(eq(suppliers.isActive, true)),
    db.select({ n: count() }).from(activityDefinitions),
    db.select({ n: count() }).from(activityDefinitions).where(eq(activityDefinitions.isActive, true)),
    db.select({ n: count() }).from(milestoneDefinitions),
    db.select({ n: count() }).from(bomStandards).where(eq(bomStandards.isActive, true)),
    db.select({ n: count() }).from(developerRateCards).where(eq(developerRateCards.isActive, true)),
  ]);

  const items = [
    {
      label: "User Management",
      href:  "/admin/users",
      desc:  "Add, disable, and assign roles to system users",
      stat:  `${activeUsers[0]?.n ?? 0} active / ${userCount[0]?.n ?? 0} total`,
      color: "#dc2626",
    },
    {
      label: "Materials & Pricing",
      href:  "/admin/materials",
      desc:  "Master material list with admin prices and price history",
      stat:  `${activeMats[0]?.n ?? 0} active / ${matCount[0]?.n ?? 0} total`,
      color: "#b45309",
    },
    {
      label: "Suppliers",
      href:  "/admin/suppliers",
      desc:  "Preferred supplier register linked to materials",
      stat:  `${activeSuppliers[0]?.n ?? 0} active / ${supplierCount[0]?.n ?? 0} total`,
      color: "#0369a1",
    },
    {
      label: "Activity Definitions",
      href:  "/admin/activity-defs",
      desc:  "Work scope and activity codes per project",
      stat:  `${activeDefs[0]?.n ?? 0} active / ${actCount[0]?.n ?? 0} total`,
      color: "#1a56db",
    },
    {
      label: "Milestone Definitions",
      href:  "/admin/milestone-defs",
      desc:  "Billing milestones and completion triggers per project",
      stat:  `${milestoneCount[0]?.n ?? 0} configured`,
      color: "#7e3af2",
    },
    {
      label: "BOM Standards",
      href:  "/admin/bom-standards",
      desc:  "Standard bill of materials per activity and unit model",
      stat:  `${bomCount[0]?.n ?? 0} active lines`,
      color: "#057a55",
    },
    {
      label: "Developer Rate Cards",
      href:  "/admin/rate-cards",
      desc:  "Gross rates per unit with retention, DP recoupment, and tax",
      stat:  `${rateCount[0]?.n ?? 0} active rates`,
      color: "#0f766e",
    },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <a href="/main-dashboard" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Dashboard</a>
        </div>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Administration</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>System configuration, reference data, and user access management.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {items.map((item) => (
            <a key={item.href} href={item.href} style={{
              display: "block", padding: "1.25rem 1.5rem",
              background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              textDecoration: "none", borderLeft: `4px solid ${item.color}`,
              transition: "box-shadow 0.15s",
            }}>
              <div style={{ fontWeight: 700, color: "#111827", marginBottom: "0.25rem", fontSize: "0.95rem" }}>{item.label}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>{item.desc}</div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: item.color }}>{item.stat}</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
