export const dynamic = "force-dynamic";
import { db } from "@/db";
import { bankAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import ImportClient from "./ImportClient";

export default async function ImportBankStatementPage() {
  await getAuthUser();

  const accounts = await db
    .select({ id: bankAccounts.id, bankName: bankAccounts.bankName, accountName: bankAccounts.accountName, accountNumber: bankAccounts.accountNumber })
    .from(bankAccounts)
    .where(eq(bankAccounts.isActive, true));

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {accounts.length === 0 ? (
        <div style={{ maxWidth: "600px", padding: "3rem", background: "#fff", borderRadius: "10px", textAlign: "center", color: "#9ca3af" }}>
          No active bank accounts found. Add a bank account first.
        </div>
      ) : (
        <ImportClient accounts={accounts} />
      )}
    </main>
  );
}
