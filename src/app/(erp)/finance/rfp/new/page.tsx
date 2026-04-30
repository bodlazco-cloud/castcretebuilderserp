export const dynamic = "force-dynamic";
import { db } from "@/db";
import { bankAccounts, costCenters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { NewRfpForm } from "./NewRfpForm";

export default async function NewRfpPage() {
  await getAuthUser();

  const [accounts, centers] = await Promise.all([
    db.select({ id: bankAccounts.id, bankName: bankAccounts.bankName, accountName: bankAccounts.accountName, accountNumber: bankAccounts.accountNumber })
      .from(bankAccounts)
      .where(eq(bankAccounts.isActive, true)),
    db.select({ id: costCenters.id, code: costCenters.code, name: costCenters.name })
      .from(costCenters)
      .where(eq(costCenters.isActive, true)),
  ]);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "640px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance/rfp" style={{ fontSize: "0.8rem", color: "#ff5a1f", textDecoration: "none" }}>← Requests for Payment</a>
        </div>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>New Request for Payment</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Submit a payment request for two-level approval.</p>
        </div>
        <NewRfpForm accounts={accounts} costCenters={centers} />
      </div>
    </main>
  );
}
