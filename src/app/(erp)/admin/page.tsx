export const dynamic = "force-dynamic";
import { db } from "@/db";
import { users } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#dc2626";

export default async function AdminPage() {
  await getAuthUser();

  const [userCount, activeUsers] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(users).where(eq(users.isActive, true)),
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
      label: "Global Settings",
      href:  "/admin/settings",
      desc:  "System-wide configuration: company info, fiscal periods, and feature flags",
      stat:  "Configure",
      color: "#374151",
    },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "800px" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <a href="/main-dashboard" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Dashboard</a>
        </div>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Administration</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>User access management and system-wide settings.</p>
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
