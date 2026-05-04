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
  phicEE:       number;  // PhilHealth EE share — deducted from gross
  hdmfEE:       number;  // Pag-IBIG EE contribution — deducted from gross
  sssRegularEE: number;  // SSS regular EE contribution (cap ₱1,000) — deducted from gross
  sssMpfEE:     number;  // SSS MPF EE contribution (cap ₱750) — deducted from gross
  sssEE:        number;  // sssRegularEE + sssMpfEE — use this for net pay calculation
  sssRegularER: number;  // SSS regular employer share (cap ₱2,000) — NOT deducted from EE pay
  sssMpfER:     number;  // SSS MPF employer share (cap ₱1,500) — NOT deducted from EE pay
  sssEC:        number;  // SSS Employees' Compensation employer cost (₱10 or ₱30) — NOT deducted from EE pay
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
  // EE rate: 5% of MSC (regular); 5% of MSC excess above ₱20k (MPF).
  // ER rate: ~10% of MSC (regular); ~10% of MSC excess above ₱20k (MPF).
  // Hard caps enforced below regardless of rate × MSC result.
  const msc = Math.min(Math.max(Math.ceil(grossPay / 500) * 500, 5_000), 35_000);

  // Employee contributions (deducted from pay)
  const sssRegularEE = Math.min(msc * 0.05,              1_000);           // cap ₱1,000
  const sssMpfEE     = Math.min(msc > 20_000 ? (msc - 20_000) * 0.05 : 0, 750);  // cap ₱750
  const sssEE        = sssRegularEE + sssMpfEE;

  // Employer contributions (NOT deducted from EE pay — tracked for total labor cost)
  const sssRegularER = Math.min(msc * 0.10,              2_000);           // cap ₱2,000
  const sssMpfER     = Math.min(msc > 20_000 ? (msc - 20_000) * 0.10 : 0, 1_500); // cap ₱1,500
  const sssEC        = msc > 14_750 ? 30 : 10;

  return { phicEE, hdmfEE, sssRegularEE, sssMpfEE, sssEE, sssRegularER, sssMpfER, sssEC };
}

/** Detect period type from date strings (YYYY-MM-DD). */
export function detectPeriodType(periodStart: string, periodEnd: string): PayrollPeriodType {
  const days =
    Math.round(
      (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86_400_000,
    ) + 1;
  return days >= 25 ? "MONTHLY" : "SEMI_MONTHLY";
}
