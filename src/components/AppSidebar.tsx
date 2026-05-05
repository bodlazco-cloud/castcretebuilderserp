"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HardHat, Building2, Package, Factory,
  Truck, ShieldCheck, Wallet, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const C = {
  bg:       "#18181b",
  fg:       "#f4f4f5",
  accent:   "#27272a",
  border:   "#27272a",
  muted:    "#a1a1aa",
  active:   "#1d4ed8",
  activeBg: "rgba(59,130,246,0.15)",
} as const;

type NavLink    = { label: string; href: string; isDivider?: never; isGroup?: never };
type NavDivider = { label: string; isDivider: true; href?: never; isGroup?: never };
type NavGroup   = { label: string; isGroup: true; isDivider?: never; href?: never };
type NavItem    = NavLink | NavDivider | NavGroup;
type NavSection = { title: string; icon: LucideIcon; items: NavItem[] };

const NAV: NavSection[] = [
  {
    title: "Planning & Engineering",
    icon: HardHat,
    items: [
      { label: "Overview",              href: "/planning" },
      { label: "Bill of Materials",     href: "/planning/bom" },
      { label: "Resource Mapping",      isGroup: true },
      { label: "MRP Queue",             href: "/planning/resource-mapping/mrp-queue" },
      { label: "Batching Forecast",     href: "/planning/resource-mapping/batching-forecast" },
      { label: "Motorpool Needs",       href: "/planning/resource-mapping/motorpool-needs" },
      { label: "Change Orders",         href: "/planning/change-orders" },
      { label: "Reports",               isDivider: true },
      { label: "Budget vs Actual",      href: "/planning/reports/budget-vs-actual" },
      { label: "Job Costing Report",    href: "/planning/reports/job-costing" },
    ],
  },
  {
    title: "Construction",
    icon: Building2,
    items: [
      { label: "Overview",             href: "/construction" },
      { label: "Site Registry",        href: "/construction/sites" },
      { label: "NTP Issuance",         href: "/construction/ntp" },
      { label: "Daily Progress",       href: "/construction/daily-progress" },
      { label: "Activity Progress",    href: "/construction/activity-progress" },
      { label: "Manpower Logs",        href: "/construction/manpower-logs" },
      { label: "Reports",              isDivider: true },
      { label: "Site Profitability",   href: "/construction/reports/site-profitability-report" },
      { label: "Progress Report",      href: "/construction/reports/progress-report" },
    ],
  },
  {
    title: "Procurement & Stock",
    icon: Package,
    items: [
      { label: "Overview",                   href: "/procurement" },
      { label: "PR/PO Management",           href: "/procurement/pr-po" },
      { label: "Logistics (MRR/Transfers)",  href: "/procurement/receipts-and-transfers" },
      { label: "Inventory",                  href: "/procurement/inventory" },
      { label: "Reports",                    isDivider: true },
      { label: "Spend Analysis",             href: "/procurement/reports/stock-level-analysis" },
    ],
  },
  {
    title: "Batching Plant",
    icon: Factory,
    items: [
      { label: "Overview",          href: "/batching" },
      { label: "Mix Designs",       href: "/batching/mix-designs" },
      { label: "Production Logs",   href: "/batching/production" },
      { label: "Internal Sales",    href: "/batching/internal-sales" },
      { label: "Plant Manpower",    href: "/batching/manpower" },
      { label: "Reports",           isDivider: true },
      { label: "Batching Reports",  href: "/batching/reports" },
    ],
  },
  {
    title: "Fleet (Motorpool)",
    icon: Truck,
    items: [
      { label: "Overview",              href: "/motorpool" },
      { label: "Equipment Directory",   href: "/motorpool/equipment" },
      { label: "Maintenance",           href: "/motorpool/maintenance" },
      { label: "Internal Rental Logs",  href: "/motorpool/internal-rental-logs" },
      { label: "Fleet Manpower",        href: "/motorpool/manpower" },
      { label: "Reports",               isDivider: true },
      { label: "Fleet Reports",         href: "/motorpool/reports" },
    ],
  },
  {
    title: "Audit & Quality",
    icon: ShieldCheck,
    items: [
      { label: "Overview",          href: "/audit" },
      { label: "PO Verification",   href: "/audit/po-compliance" },
      { label: "Milestone Audit",   href: "/audit/milestone-verification" },
      { label: "Variance Audit",    href: "/audit/variance-audit" },
      { label: "QA Punch-lists",    href: "/audit/qa-punch-list" },
      { label: "Reports",           isDivider: true },
      { label: "Audit Reports",     href: "/audit/reports" },
    ],
  },
  {
    title: "Finance & Accounting",
    icon: Wallet,
    items: [
      { label: "Overview",               href: "/finance" },
      { label: "Billing",                href: "/finance/invoices" },
      { label: "Payables",               href: "/finance/payables" },
      { label: "Loans",                  href: "/finance/loans" },
      { label: "Bills",                  href: "/finance/bills" },
      { label: "Expense",                href: "/finance/expense" },
      { label: "Banking / Recon",        href: "/finance/banking" },
      { label: "Chart of Accounts",      href: "/finance/chart-of-accounts" },
      { label: "Reports",                isDivider: true },
      { label: "P&L (by Dept)",          href: "/finance/reports/profit-and-loss" },
      { label: "Balance Sheet",          href: "/finance/reports/balance-sheet" },
      { label: "Cash Flow Projections",  href: "/finance/reports/cash-flow" },
      { label: "General Ledger",         href: "/finance/reports/ledger" },
      { label: "Trial Balance",          href: "/finance/reports/trial-balance" },
      { label: "Vendor Summary",         href: "/finance/reports/vendor-summary" },
      { label: "Developer Summary",      href: "/finance/reports/developer-summary" },
      { label: "Aged Payables",          href: "/finance/reports/aged-payables" },
      { label: "Aged Receivables",       href: "/finance/reports/aged-receivables" },
    ],
  },
  {
    title: "Administration",
    icon: Settings,
    items: [
      { label: "Overview",              href: "/admin" },
      { label: "Master Lists",          isGroup: true },
      { label: "Materials & Pricing",   href: "/admin/materials" },
      { label: "Suppliers",             href: "/admin/suppliers" },
      { label: "Subcontractors",        href: "/master-list/subcontractors" },
      { label: "Developers",            href: "/master-list/developers" },
      { label: "Projects",              href: "/master-list/projects" },
      { label: "Scope of Work",         href: "/master-list/sow" },
      { label: "Construction Phases",   href: "/master-list/construction-phases" },
      { label: "Activity Definitions",  isGroup: true },
      { label: "Activity Defs",             href: "/admin/activity-defs" },
      { label: "Milestone Defs",            href: "/admin/milestone-defs" },
      { label: "BOM Standards",             href: "/admin/bom-standards" },
      { label: "Developer Rate Cards",      href: "/admin/rate-cards" },
      { label: "Subcontractor Rate Cards",  href: "/admin/subcon-rate-cards" },
      { label: "System",                isDivider: true },
      { label: "User Permissions",      href: "/admin/users" },
      { label: "System Logs",           href: "/admin/system-logs" },
      { label: "Global Configurations", href: "/admin/global-config" },
    ],
  },
];

// Overview-only pages: exact match required for active highlight
const OVERVIEW_HREFS = new Set([
  "/planning", "/construction", "/procurement", "/batching",
  "/motorpool", "/audit", "/finance", "/master-list", "/admin",
]);

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

interface AppSidebarProps {
  displayName: string;
  deptCode: string;
  mobileOpen?: boolean;
  desktopOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({
  displayName, deptCode,
  mobileOpen = false, desktopOpen = true, onClose,
}: AppSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (OVERVIEW_HREFS.has(href)) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const activeSection = NAV.find((s) =>
    s.items.some((item) => item.href && isActive(item.href))
  )?.title;

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(activeSection ? [activeSection] : [NAV[0].title])
  );

  function toggleSection(title: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  // Production target — TODO: wire to real DB query via layout.tsx props
  const targetUnits = 120;
  const completedUnits = 84;  // placeholder
  const progressPct = Math.round((completedUnits / targetUnits) * 100);

  return (
    <aside
      className={`app-sidebar${mobileOpen ? " sidebar-open" : ""}${!desktopOpen ? " sidebar-desktop-collapsed" : ""}`}
      style={{
        width: "240px", minWidth: "240px", height: "100%",
        background: C.bg, color: C.fg,
        display: "flex", flexDirection: "column", overflow: "hidden",
        borderRight: `1px solid ${C.border}`, fontFamily: "system-ui, sans-serif",
        transition: "width 0.25s ease, min-width 0.25s ease",
      }}
    >
      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>
        {/* Executive Dashboard */}
        <Link href="/main-dashboard" onClick={onClose} style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.5rem 1rem", marginBottom: "0.25rem",
          textDecoration: "none", fontSize: "0.875rem", fontWeight: 600,
          color: isActive("/main-dashboard") ? "#fff" : C.fg,
          background: isActive("/main-dashboard") ? C.activeBg : "transparent",
          borderLeft: isActive("/main-dashboard") ? `3px solid ${C.active}` : "3px solid transparent",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Executive Dashboard
        </Link>

        <div style={{ height: "1px", background: C.border, margin: "0.25rem 0 0.5rem" }} />

        {NAV.map((section) => {
          const SectionIcon = section.icon;
          const isOpen = openSections.has(section.title);
          const hasCurrent = section.items.some((item) => item.href && isActive(item.href));

          return (
            <div key={section.title}>
              <button onClick={() => toggleSection(section.title)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "0.45rem 1rem",
                background: "transparent", border: "none", cursor: "pointer",
                color: hasCurrent ? "#fff" : C.muted,
                fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em",
                textTransform: "uppercase", textAlign: "left",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                  <SectionIcon
                    size={13}
                    style={{ flexShrink: 0, color: hasCurrent ? "#3b82f6" : C.muted }}
                  />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {section.title}
                  </span>
                </span>
                <Chevron open={isOpen} />
              </button>

              {isOpen && (
                <div style={{ marginBottom: "0.25rem" }}>
                  {section.items.map((item, idx) => {
                    // Section divider (e.g. "Reports")
                    if (item.isDivider) {
                      return (
                        <div key={`div-${idx}`} style={{
                          display: "flex", alignItems: "center", gap: "0.4rem",
                          padding: "0.5rem 1rem 0.25rem 1.75rem",
                          marginTop: "0.25rem",
                        }}>
                          <div style={{ flex: 1, height: "1px", background: C.border }} />
                          <span style={{
                            fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "#52525b", whiteSpace: "nowrap",
                          }}>
                            {item.label}
                          </span>
                          <div style={{ flex: 1, height: "1px", background: C.border }} />
                        </div>
                      );
                    }

                    // Sub-group label (e.g. "Resource Mapping")
                    if (item.isGroup) {
                      return (
                        <div key={`grp-${idx}`} style={{
                          padding: "0.5rem 1rem 0.15rem 1.75rem",
                          fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em",
                          textTransform: "uppercase", color: "#3b82f6",
                        }}>
                          {item.label}
                        </div>
                      );
                    }

                    // Indent items that follow a group label
                    const isUnderGroup = idx > 0 && section.items.slice(0, idx).some((it, i) =>
                      it.isGroup && !section.items.slice(i + 1, idx).some((x) => x.isDivider || x.isGroup)
                    );
                    const paddingLeft = isUnderGroup ? "2.25rem" : "1.75rem";

                    const active = isActive(item.href);
                    return (
                      <Link key={item.href} href={item.href} onClick={onClose} style={{
                        display: "block",
                        padding: `0.4rem 1rem 0.4rem ${paddingLeft}`,
                        textDecoration: "none", fontSize: "0.8rem",
                        color: active ? "#fff" : C.muted,
                        background: active ? C.activeBg : "transparent",
                        borderLeft: active ? `3px solid ${C.active}` : "3px solid transparent",
                        fontWeight: active ? 600 : 400,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Footer: production target + sign out ─────────────────── */}
      <div style={{ padding: "0.75rem", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        {/* Production Target Widget */}
        <div style={{
          background: "#1d1d20", borderRadius: "10px", padding: "0.85rem 1rem",
          marginBottom: "0.75rem",
        }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: C.muted, marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Monthly Production Target
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "#fff" }}>
              {completedUnits} / {targetUnits}
            </span>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#3b82f6" }}>
              {progressPct}%
            </span>
          </div>
          <div style={{ background: "#3f3f46", height: "4px", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ background: "#3b82f6", height: "100%", width: `${progressPct}%`, transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* User + sign out */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: C.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </div>
            {deptCode && (
              <div style={{
                display: "inline-block", marginTop: "0.15rem",
                padding: "0.1rem 0.4rem", background: "rgba(29,78,216,0.3)", color: "#93c5fd",
                borderRadius: "999px", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.05em",
              }}>
                {deptCode}
              </div>
            )}
          </div>
          <form method="POST" action="/auth/logout" style={{ margin: 0, flexShrink: 0 }}>
            <button type="submit" style={{
              padding: "0.35rem 0.65rem", background: "transparent",
              border: `1px solid ${C.border}`, borderRadius: "6px",
              color: C.muted, fontSize: "0.7rem", cursor: "pointer", whiteSpace: "nowrap",
            }}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
