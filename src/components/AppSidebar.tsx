"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const C = {
  bg:       "#18181b",
  fg:       "#f4f4f5",
  accent:   "#27272a",
  border:   "#27272a",
  muted:    "#a1a1aa",
  active:   "#1d4ed8",
  activeBg: "rgba(59,130,246,0.15)",
} as const;

type NavLink     = { label: string; href: string; isDivider?: never };
type NavDivider  = { label: string; isDivider: true; href?: never };
type NavItem     = NavLink | NavDivider;
type NavSection  = { title: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    title: "Master List",
    items: [
      { label: "Overview",          href: "/master-list" },
      { label: "Projects / Sites",  href: "/master-list/projects" },
      { label: "Scope of Work",     href: "/master-list/sow" },
      { label: "Materials Master",  href: "/master-list/materials" },
      { label: "Vendors",           href: "/master-list/vendors" },
      { label: "Subcontractors",    href: "/master-list/subcontractors" },
      { label: "Developers",        href: "/master-list/developers" },
    ],
  },
  {
    title: "Planning & Engineering",
    items: [
      { label: "Overview",              href: "/planning" },
      { label: "Bill of Materials",     href: "/planning/bom" },
      { label: "Resource Forecasting",  href: "/planning/resource-forecasting" },
      { label: "Change Order Requests", href: "/planning/change-orders" },
      { label: "Reports",               isDivider: true },
      { label: "Job Costing BvA",       href: "/planning/reports/job-costing-bva" },
    ],
  },
  {
    title: "Construction",
    items: [
      { label: "Overview",             href: "/construction" },
      { label: "Sites",                href: "/construction/sites" },
      { label: "NTP Register",         href: "/construction/ntp" },
      { label: "Issue NTP",            href: "/construction/issue-ntp" },
      { label: "Daily Progress",       href: "/construction/daily-progress" },
      { label: "Log Progress",         href: "/construction/log-progress" },
      { label: "Submit WAR",           href: "/construction/submit-war" },
      { label: "Reports",              isDivider: true },
      { label: "Site Profitability",   href: "/construction/reports/site-profitability-report" },
    ],
  },
  {
    title: "Procurement & Stock",
    items: [
      { label: "Overview",              href: "/procurement" },
      { label: "Purchase Requests",     href: "/procurement/pr" },
      { label: "Purchase Orders",       href: "/procurement/po" },
      { label: "Inventory",             href: "/procurement/inventory" },
      { label: "Receipts & Transfers",  href: "/procurement/receipts-and-transfers" },
      { label: "Vendors",               href: "/procurement/vendors" },
      { label: "Price Change",          href: "/procurement/price-change" },
      { label: "Reports",               isDivider: true },
      { label: "Stock Level Analysis",  href: "/procurement/reports/stock-level-analysis" },
    ],
  },
  {
    title: "Batching Plant",
    items: [
      { label: "Overview",         href: "/batching" },
      { label: "Production",       href: "/batching/production" },
      { label: "Mix Designs",      href: "/batching/mix-designs" },
      { label: "Yield Report",     href: "/batching/yield" },
      { label: "Internal Sales",   href: "/batching/internal-sales" },
      { label: "Log Batch",        href: "/batching/log-batch" },
      { label: "Reports",          isDivider: true },
      { label: "Batching Reports", href: "/batching/reports" },
    ],
  },
  {
    title: "Motorpool",
    items: [
      { label: "Overview",               href: "/motorpool" },
      { label: "Equipment Register",     href: "/motorpool/equipment" },
      { label: "Internal Rental Logs",   href: "/motorpool/internal-rental-logs" },
      { label: "Fuel Logs",              href: "/motorpool/fuel" },
      { label: "Fix or Flip",            href: "/motorpool/fix-or-flip" },
      { label: "Manpower",               href: "/motorpool/manpower" },
      { label: "Reports",                isDivider: true },
      { label: "Motorpool Reports",      href: "/motorpool/reports" },
    ],
  },
  {
    title: "Audit & Quality",
    items: [
      { label: "Overview",                href: "/audit" },
      { label: "PO Compliance",           href: "/audit/po-compliance" },
      { label: "Triple Match",            href: "/audit/triple-match" },
      { label: "Inspections",             href: "/audit/inspections" },
      { label: "Milestone Verification",  href: "/audit/milestone-verification" },
      { label: "QA Punch List",           href: "/audit/qa-punch-list" },
      { label: "Reports",                 isDivider: true },
      { label: "Material Variance",       href: "/audit/reports/material-variance" },
    ],
  },
  {
    title: "Finance & Accounting",
    items: [
      { label: "Overview",             href: "/finance" },
      { label: "Invoices",             href: "/finance/invoices" },
      { label: "Payables",             href: "/finance/payables" },
      { label: "Banking",              href: "/finance/banking" },
      { label: "Request for Payment",  href: "/finance/rfp" },
      { label: "Chart of Accounts",    href: "/finance/chart-of-accounts" },
      { label: "Cost Center",          href: "/finance/cost-center" },
      { label: "Reports",              isDivider: true },
      { label: "Cash Flow",            href: "/finance/reports/cash-flow" },
      { label: "Profit & Loss",        href: "/finance/reports/profit-and-loss" },
      { label: "Balance Sheet",        href: "/finance/reports/balance-sheet" },
      { label: "Trial Balance",        href: "/finance/reports/trial-balance" },
      { label: "Ledger",               href: "/finance/reports/ledger" },
    ],
  },
  {
    title: "HR & Payroll",
    items: [
      { label: "Overview",           href: "/hr" },
      { label: "Employee Registry",  href: "/hr/registry" },
      { label: "DTR",                href: "/hr/dtr" },
      { label: "Payroll",            href: "/hr/payroll" },
      { label: "Leave Management",   href: "/hr/leaves" },
      { label: "Reports",            isDivider: true },
      { label: "HR Reports",         href: "/hr/reports" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Overview",        href: "/admin" },
      { label: "User Management", href: "/admin/users" },
    ],
  },
];

// Overview-only pages: only exact match marks them active
const OVERVIEW_HREFS = new Set([
  "/planning", "/construction", "/procurement", "/batching",
  "/motorpool", "/audit", "/finance", "/hr", "/master-list", "/admin",
]);

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

interface AppSidebarProps { displayName: string; deptCode: string }

export default function AppSidebar({ displayName, deptCode }: AppSidebarProps) {
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

  return (
    <aside style={{
      width: "240px", minWidth: "240px", height: "100vh",
      background: C.bg, color: C.fg,
      display: "flex", flexDirection: "column", overflow: "hidden",
      borderRight: `1px solid ${C.border}`, fontFamily: "system-ui, sans-serif",
    }}>
      {/* Brand */}
      <div style={{
        padding: "0 1rem", height: "56px", display: "flex", alignItems: "center",
        borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}>Castcrete 360</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>
        {/* Main Dashboard */}
        <Link href="/main-dashboard" style={{
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
          Main Dashboard
        </Link>

        <div style={{ height: "1px", background: C.border, margin: "0.25rem 0 0.5rem" }} />

        {NAV.map((section) => {
          const isOpen = openSections.has(section.title);
          const hasCurrent = section.items.some((item) => item.href && isActive(item.href));

          return (
            <div key={section.title}>
              <button onClick={() => toggleSection(section.title)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "0.45rem 1rem",
                background: "transparent", border: "none", cursor: "pointer",
                color: hasCurrent ? "#fff" : C.muted,
                fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.07em",
                textTransform: "uppercase", textAlign: "left",
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {section.title}
                </span>
                <Chevron open={isOpen} />
              </button>

              {isOpen && (
                <div style={{ marginBottom: "0.25rem" }}>
                  {section.items.map((item, idx) => {
                    if (item.isDivider) {
                      return (
                        <div key={`div-${idx}`} style={{
                          display: "flex", alignItems: "center", gap: "0.4rem",
                          padding: "0.5rem 1rem 0.25rem 1.75rem",
                          marginTop: "0.25rem",
                        }}>
                          <div style={{ flex: 1, height: "1px", background: C.border }} />
                          <span style={{
                            fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "#52525b", whiteSpace: "nowrap",
                          }}>
                            {item.label}
                          </span>
                          <div style={{ flex: 1, height: "1px", background: C.border }} />
                        </div>
                      );
                    }

                    const active = isActive(item.href);
                    return (
                      <Link key={item.href} href={item.href} style={{
                        display: "block",
                        padding: "0.4rem 1rem 0.4rem 1.75rem",
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

      {/* User + sign out */}
      <div style={{ padding: "0.75rem 1rem", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: C.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </div>
          {deptCode && (
            <div style={{
              display: "inline-block", marginTop: "0.2rem",
              padding: "0.1rem 0.45rem", background: "rgba(29,78,216,0.3)", color: "#93c5fd",
              borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em",
            }}>
              {deptCode}
            </div>
          )}
        </div>
        <form method="POST" action="/auth/logout" style={{ margin: 0 }}>
          <button type="submit" style={{
            width: "100%", padding: "0.4rem 0", background: "transparent",
            border: `1px solid ${C.border}`, borderRadius: "6px",
            color: C.muted, fontSize: "0.75rem", cursor: "pointer", textAlign: "center",
          }}>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
