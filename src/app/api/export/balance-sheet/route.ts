import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
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

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Balance Sheet");
  ws.columns = [{ width: 50 }, { width: 5 }, { width: 20 }];

  ws.addRow([`Castcrete Builders — Balance Sheet`]);
  ws.addRow([`As of ${asOf}`]);
  ws.addRow([]);
  ws.addRow(["ASSETS"]);
  ws.addRow(["Cash in Banks"]);
  bankData.forEach((b) => ws.addRow([`  ${b.bankName} — ${b.accountName}`, "", fmt(Number(b.currentBalance))]));
  ws.addRow(["Total Cash", "", fmt(cashTotal)]);
  ws.addRow(["Trade Receivables (Outstanding Invoices)", "", fmt(receivablesTotal)]);
  ws.addRow(["Inventory on Hand (units)", "", inventoryUnits]);
  ws.addRow(["TOTAL ASSETS", "", fmt(totalAssets)]);
  ws.addRow([]);
  ws.addRow(["LIABILITIES"]);
  ws.addRow(["Subcon Payables (pending/approved/unpaid)", "", fmt(payablesTotal)]);
  ws.addRow(["Developer Advance Remaining Balance", "", fmt(advanceTotal)]);
  ws.addRow(["TOTAL LIABILITIES", "", fmt(totalLiabilities)]);
  ws.addRow([]);
  ws.addRow(["NET EQUITY (Assets − Liabilities)", "", fmt(equity)]);

  const buf = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="balance-sheet-${date}.xlsx"`,
    },
  });
}
