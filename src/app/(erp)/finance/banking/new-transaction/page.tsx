export const dynamic = "force-dynamic";
import { db } from "@/db";
import { bankAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { NewTransactionForm } from "./NewTransactionForm";

export default async function NewTransactionPage() {
  await getAuthUser();

  const accounts = await db
    .select({ id: bankAccounts.id, bankName: bankAccounts.bankName, accountName: bankAccounts.accountName, accountNumber: bankAccounts.accountNumber })
    .from(bankAccounts)
    .where(eq(bankAccounts.isActive, true));

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "640px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance/banking" style={{ fontSize: "0.8rem", color: "#ff5a1f", textDecoration: "none" }}>← Banking</a>
        </div>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>New Transaction</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Record a bank debit or credit transaction.</p>
        </div>
        <NewTransactionForm accounts={accounts} />
      </div>
    </main>
  );
}
