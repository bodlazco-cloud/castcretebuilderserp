/**
 * Philippine statutory deduction computation — 2025 rates.
 *
 * Sources:
 *  - PHIC Circular 2024-0001: 5% premium, 2.5% EE share, ₱100k monthly salary cap
 *  - SSS Circular 2024-006:   5% EE rate, MSC ₱5k–₱35k; MPF on MSC above ₱20k
 *  - HDMF current regs:       2% of basic pay, ₱100/month EE maximum
 */

export type PayrollPeriodType = "MONTHLY" | "SEMI_MONTHLY";

export type StatutoryDeductions = {
  phicEE: number;  // PhilHealth EE share — deducted from gross
  hdmfEE: number;  // Pag-IBIG EE contribution — deducted from gross
  sssEE:  number;  // SSS EE contribution including MPF if MSC > ₱20k — deducted from gross
  sssEC:  number;  // SSS Employees' Compensation — EMPLOYER COST ONLY, not deducted from EE pay
};

/**
 * @param grossPay  - Total earnings for the payroll period
 * @param basicPay  - Basic salary component (Pag-IBIG base); defaults to grossPay
 * @param period    - "MONTHLY" for full-month runs; "SEMI_MONTHLY" halves PHIC and HDMF caps
 */
export function computeStatutoryDeductions(
  grossPay: number,
  basicPay: number          = grossPay,
  period:   PayrollPeriodType = "MONTHLY",
): StatutoryDeductions {
  const isMonthly = period === "MONTHLY";

  // ── PhilHealth (PHIC Circular 2024-0001) ─────────────────────────────────
  // 5% total premium; 2.5% EE share.
  // Monthly floor ₱250 EE (salary floor ₱10k); monthly cap ₱2,500 EE (salary cap ₱100k).
  // Semi-monthly payroll: halve both floor and cap.
  const phicFloor   = isMonthly ? 250 : 125;
  const phicCap     = isMonthly ? 2_500 : 1_250;
  const phicEE      = Math.min(Math.max(grossPay * 0.025, phicFloor), phicCap);

  // ── Pag-IBIG / HDMF ──────────────────────────────────────────────────────
  // 2% of basic pay; monthly EE maximum ₱100 → ₱50 per semi-monthly period.
  const hdmfCap = isMonthly ? 100 : 50;
  const hdmfEE  = Math.min(basicPay * 0.02, hdmfCap);

  // ── SSS (Circular 2024-006) ───────────────────────────────────────────────
  // Monthly Salary Credit (MSC): gross rounded up to nearest ₱500, bounded ₱5k–₱35k.
  // EE rate: 5% of MSC up to ₱20k; Mandatory Provident Fund (MPF) = 5% on excess.
  // Both regular SSS and MPF are EE deductions that go to the member's account.
  // EC (Employees' Compensation): employer-borne only — never deducted from EE pay.
  const msc = Math.min(Math.max(Math.ceil(grossPay / 500) * 500, 5_000), 35_000);

  let sssEE: number;
  if (msc <= 20_000) {
    sssEE = msc * 0.05;
  } else {
    const regular = 20_000 * 0.05;          // ₱1,000 — capped at ₱20k MSC regular SSS
    const mpf     = (msc - 20_000) * 0.05;  // MPF on excess up to ₱35k MSC
    sssEE = regular + mpf;
  }

  // EC rates per SSS schedule (employer cost only)
  const sssEC = msc > 14_750 ? 30 : 10;

  return { phicEE, hdmfEE, sssEE, sssEC };
}

/** Detect period type from date strings (YYYY-MM-DD). */
export function detectPeriodType(periodStart: string, periodEnd: string): PayrollPeriodType {
  const days =
    Math.round(
      (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86_400_000,
    ) + 1;
  return days >= 25 ? "MONTHLY" : "SEMI_MONTHLY";
}
