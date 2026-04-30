import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/db";
import { bankAccounts, invoices, payables, inventoryStock, developerAdvanceTracker } from "@/db/schema";
import { eq, sql, notInArray, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const asOf = new Date().toLocaleDateString("en-PH", { dateStyle: "long" });

  const [bankData, receivableData, inventoryData, payableData, advanceData] = await Promise.all([
    db.select({ bankName: bankAccounts.bankName, accountName: bankAccounts.accountName, currentBalance: bankAccounts.currentBalance })
      .from(bankAccounts).where(eq(bankAccounts.isActive, true)),
    db.select({ total: sql<string>`sum(net_amount_due::numeric)` }).from(invoices).where(notInArray(invoices.status, ["COLLECTED", "REJECTED"])),
    db.select({ total: sql<string>`sum(quantity_on_hand::numeric)` }).from(inventoryStock),
    db.select({ total: sql<string>`sum(net_payable::numeric)` }).from(payables).where(inArray(payables.status, ["APPROVED", "PENDING_REVIEW", "DRAFT"])),
    db.select({ total: sql<string>`sum(remaining_balance::numeric)` }).from(developerAdvanceTracker),
  ]);

  const cashTotal        = bankData.reduce((s, b) => s + Number(b.currentBalance), 0);
  const receivablesTotal = Number(receivableData[0]?.total ?? 0);
  const inventoryUnits   = Number(inventoryData[0]?.total ?? 0);
  const payablesTotal    = Number(payableData[0]?.total ?? 0);
  const advanceTotal     = Number(advanceData[0]?.total ?? 0);
  const totalAssets      = cashTotal + receivablesTotal;
  const totalLiabilities = payablesTotal + advanceTotal;
  const equity           = totalAssets - totalLiabilities;

  const fmt = (n: number) => Number(n.toFixed(2));

  const rows: (string | number)[][] = [
    [`Castcrete Builders — Balance Sheet`],
    [`As of ${asOf}`],
    [],
    ["ASSETS"],
    ["Cash in Banks", "", ""],
    ...bankData.map((b) => [`  ${b.bankName} — ${b.accountName}`, "", fmt(Number(b.currentBalance))]),
    ["Total Cash", "", fmt(cashTotal)],
    ["Trade Receivables (Outstanding Invoices)", "", fmt(receivablesTotal)],
    ["Inventory on Hand (units)", "", inventoryUnits],
    ["TOTAL ASSETS", "", fmt(totalAssets)],
    [],
    ["LIABILITIES"],
    ["Subcon Payables (pending/approved/unpaid)", "", fmt(payablesTotal)],
    ["Developer Advance Remaining Balance", "", fmt(advanceTotal)],
    ["TOTAL LIABILITIES", "", fmt(totalLiabilities)],
    [],
    ["NET EQUITY (Assets − Liabilities)", "", fmt(equity)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 50 }, { wch: 5 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="balance-sheet-${date}.xlsx"`,
    },
  });
}
