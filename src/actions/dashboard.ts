"use server";

import { db } from "@/db";
import { sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SiteProfitabilityRow {
  unit_id:                string;
  unit_code:              string;
  unit_model:             string;
  project_id:             string;
  block_id:               string;
  current_category:       string;
  contract_price:         string | null;
  total_materials:        string;
  total_labor:            string;
  total_concrete_internal: string;
  total_fleet_internal:   string;
  total_direct_cost:      string;
  net_profit_margin:      string | null;
}

export interface ExecutiveMetrics {
  // Revenue (only units with contract_price set)
  totalRevenue:        number;
  revenueUnitCount:    number;

  // Costs across all active units
  totalDirectCost:     number;

  // Profit — only computable on units that have contract_price
  totalProfit:         number;
  netMarginPct:        string;   // formatted "12.3%", "—" when no revenue

  // Breakdown by cost stream
  totalMaterials:      number;
  totalLabor:          number;
  totalConcrete:       number;
  totalFleet:          number;

  // Phase distribution
  phaseCounts: { STRUCTURAL: number; ARCHITECTURAL: number; TURNOVER: number };

  // Per-unit rows for drill-down (truncated to first 50)
  units:               SiteProfitabilityRow[];
}

/**
 * Queries the site_profitability view and aggregates figures for the BOD Cockpit.
 * Gemini used supabase client and did not guard against null contract_price or
 * division by zero. This version is null-safe and Supabase-client-free.
 */
export async function getExecutiveMetrics(): Promise<ExecutiveMetrics> {
  const rows = await db.execute<SiteProfitabilityRow>(
    sql`SELECT * FROM site_profitability ORDER BY project_id, unit_code`,
  );

  let totalRevenue    = 0;
  let revenueUnitCount = 0;
  let totalProfit     = 0;
  let totalDirectCost = 0;
  let totalMaterials  = 0;
  let totalLabor      = 0;
  let totalConcrete   = 0;
  let totalFleet      = 0;
  const phaseCounts = { STRUCTURAL: 0, ARCHITECTURAL: 0, TURNOVER: 0 };

  for (const row of rows) {
    const directCost = Number(row.total_direct_cost ?? 0);
    totalDirectCost += directCost;
    totalMaterials  += Number(row.total_materials        ?? 0);
    totalLabor      += Number(row.total_labor            ?? 0);
    totalConcrete   += Number(row.total_concrete_internal ?? 0);
    totalFleet      += Number(row.total_fleet_internal   ?? 0);

    // net_profit_margin is null when contract_price is null (Completed Contract Method)
    if (row.contract_price !== null && row.net_profit_margin !== null) {
      totalRevenue     += Number(row.contract_price);
      totalProfit      += Number(row.net_profit_margin);
      revenueUnitCount += 1;
    }

    const cat = row.current_category as keyof typeof phaseCounts;
    if (cat in phaseCounts) phaseCounts[cat] += 1;
  }

  // Guard: no division by zero when no units have contract_price set
  const netMarginPct =
    totalRevenue > 0
      ? (totalProfit / totalRevenue * 100).toFixed(1) + "%"
      : "—";

  return {
    totalRevenue,
    revenueUnitCount,
    totalDirectCost,
    totalProfit,
    netMarginPct,
    totalMaterials,
    totalLabor,
    totalConcrete,
    totalFleet,
    phaseCounts,
    units: rows.slice(0, 50),
  };
}
