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
    title: "Planning & Engineering",
    items: [
      { label: "Overview",              href: "/planning" },
      { label: "Engineering",           isDivider: true },
      { label: "Bill of Materials",     href: "/planning/bom" },
      { label: "Resource Mapping",      isDivider: true },
      { label: "MRP Queue",             href: "/planning/mrp-queue" },
      { label: "Batching Forecast",     href: "/planning/batching-forecast" },
      { label: "Motorpool Needs",       href: "/planning/motorpool-needs" },
      { label: "Change Orders",         href: "/planning/change-orders" },
      { label: "Reports",               isDivider: true },
      { label: "Budget vs Actual",      href: "/planning/reports/budget-vs-actual" },
      { label: "Job Costing Report",    href: "/planning/reports/job-costing" },
    ],
  },
  {
    title: "Construction",
    items: [
      { label: "Overview",              href: "/construction" },
      { label: "Site Registry",         href: "/construction/sites" },
      { label: "NTP Issuance",          href: "/construction/ntp" },
      { label: "Daily Progress",        href: "/construction/daily-progress" },
      { label: "Manpower Logs",         href: "/construction/manpower" },
      { label: "WAR",                   href: "/construction/war" },
      { label: "Reports",               isDivider: true },
      { label: "Site Profitability",    href: "/construction/reports/site-profitability-report" },
      { label: "Progress Report",       href: "/construction/reports/progress-report" },
    ],
  },
  {
    title: "Procurement & Stock",
    items: [
      { label: "Overview",              href: "/procurement" },
      { label: "PR/PO Management",      href: "/procurement/pr-po" },
      { label: "Logistics",             href: "/procurement/logistics" },
      { label: "Inventory",             href: "/procurement/inventory" },
      { label: "Reports",               isDivider: true },
      { label: "Procurement Reports",   href: "/procurement/reports" },
    ],
  },
  {
    title: "Batching Plant",
    items: [
      { label: "Overview",              href: "/batching" },
      { label: "Mix Designs",           href: "/batching/mix-designs" },
      { label: "Production Logs",       href: "/batching/production" },
      { label: "Internal Sales",        href: "/batching/internal-sales" },
      { label: "Plant Manpower",        href: "/batching/manpower" },
      { label: "Reports",               isDivider: true },
      { label: "Batching Reports",      href: "/batching/reports" },
    ],
  },
  {
    title: "Fleet (MotorPool)",
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
    items: [
      { label: "Overview",              href: "/audit" },
      { label: "PO Verification",       href: "/audit/po-verification" },
      { label: "Milestone Audit",       href: "/audit/milestone-audit" },
      { label: "Variance Audit",        href: "/audit/variance-audit" },
      { label: "QA Punch-lists",        href: "/audit/qa-punch-list" },
      { label: "Reports",               isDivider: true },
      { label: "Audit Reports",         href: "/audit/reports" },
    ],
  },
  {
    title: "Finance & Accounting",
    items: [
      { label: "Overview",              href: "/finance" },
      { label: "Billing",               href: "/finance/billing" },
      { label: "Payables",              href: "/finance/payables" },
      { label: "Loans",                 href: "/finance/loans" },
      { label: "Bills",                 href: "/finance/bills" },
      { label: "Expense",               href: "/finance/expense" },
      { label: "Banking / Recon",       href: "/finance/banking" },
      { label: "Chart of Accounts",     href: "/finance/chart-of-accounts" },
      { label: "Reports",               isDivider: true },
      { label: "P&L by Dept",           href: "/finance/reports/profit-and-loss" },
      { label: "Balance Sheet",         href: "/finance/reports/balance-sheet" },
      { label: "Cash Flow Projections", href: "/finance/reports/cash-flow" },
      { label: "General Ledger",        href: "/finance/reports/ledger" },
      { label: "Trial Balance",         href: "/finance/reports/trial-balance" },
      { label: "Vendor Summary",        href: "/finance/reports/vendor-summary" },
      { label: "Developer Summary",     href: "/finance/reports/developer-summary" },
      { label: "Aged Payables",         href: "/finance/reports/aged-payables" },
      { label: "Aged Receivables",      href: "/finance/reports/aged-receivables" },
    ],
  },
  {
    title: "Master List",
    items: [
      { label: "Construction Phases",   href: "/master-list/projects" },
      { label: "Material List",         href: "/master-list/materials" },
      { label: "Vendors",               href: "/master-list/vendors" },
      { label: "Subcontractors",        href: "/master-list/subcontractors" },
      { label: "Developers",            href: "/master-list/developers" },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Settings",              href: "/admin/settings" },
      { label: "User Permissions",      href: "/admin/users" },
      { label: "System Logs",           href: "/admin/system-logs" },
      { label: "Global Configurations", href: "/admin/global-config" },
    ],
  },
];

// Overview-only pages: only exact match marks them active
const OVERVIEW_HREFS = new Set([
  "/planning", "/construction", "/procurement", "/batching",
  "/motorpool", "/audit", "/finance", "/main-dashboard",
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

interface AppSidebarProps {
  displayName: string;
  deptCode: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({ displayName, deptCode, mobileOpen = false, onClose }: AppSidebarProps) {
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
    <aside
      className={`app-sidebar${mobileOpen ? " sidebar-open" : ""}`}
      style={{
        width: "240px", minWidth: "240px", height: "100vh",
        background: C.bg, color: C.fg,
        display: "flex", flexDirection: "column", overflow: "hidden",
        borderRight: `1px solid ${C.border}`, fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Brand */}
      <div style={{
        padding: "0 1rem", height: "56px", display: "flex", alignItems: "center",
        justifyContent: "space-between",
        borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}>Castcrete 360</span>
        <button
          onClick={onClose}
          className="mobile-only"
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: C.muted, padding: "0.25rem", alignItems: "center",
          }}
          aria-label="Close navigation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>
        {/* Executive Overview */}
        <Link href="/main-dashboard" onClick={onClose} style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.5rem 1rem", marginBottom: "0.25rem",
          textDecoration: "none", fontSize: "0.8rem", fontWeight: 600,
          color: isActive("/main-dashboard") ? "#fff" : C.fg,
          background: isActive("/main-dashboard") ? C.activeBg : "transparent",
          borderLeft: isActive("/main-dashboard") ? `3px solid ${C.active}` : "3px solid transparent",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Executive Overview
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
                      <Link key={item.href} href={item.href} onClick={onClose} style={{
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
