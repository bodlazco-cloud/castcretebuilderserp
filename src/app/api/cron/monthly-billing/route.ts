import { NextRequest, NextResponse } from "next/server";
import { runMonthlyBilling } from "@/actions/motorpool";

// Protect with a secret so only the cron service can trigger this.
// Set CRON_SECRET in your Replit environment variables.
// Configure your cron service (e.g. cron-job.org) to call:
//   GET https://your-app.replit.app/api/cron/monthly-billing
//   Header: Authorization: Bearer <CRON_SECRET>
// Schedule: 0 1 1 * *  (01:00 on the 1st of every month)

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runMonthlyBilling();

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    billingMonth: result.billingMonth,
    posted: result.posted,
    skipped: result.skipped,
  });
}
