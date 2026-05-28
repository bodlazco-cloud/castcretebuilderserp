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

type NavLink    = { label: string; href: string; isDivider?: never; isGroup?: never };
type NavDivider = { label: string; isDivider: true; href?: never; isGroup?: never };
type NavGroup   = { label: string; isGroup: true; items: NavLink[]; href?: never; isDivider?: never };
type NavItem    = NavLink | NavDivider | NavGroup;
type NavSection = { title: string; items: NavItem[] };

const NAV: NavSection[] = [
  {
    title: "Planning & Engineering",
    items: [
      { label: "Overview",          href: "/planning" },
      { label: "Engineering", isGroup: true, items: [
        { label: "Bill of Materials",   href: "/planning/bom" },
      ]},
      { label: "Resource Mapping", isGroup: true, items: [
        { label: "MRP Queue",           href: "/planning/mrp-queue" },
        { label: "Batching Forecast",   href: "/planning/batching-forecast" },
        { label: "Motorpool Needs",     href: "/planning/motorpool-needs" },
        { label: "Variance Requests",   href: "/planning/variance-requests" },
      ]},
      { label: "Reports", isGroup: true, items: [
        { label: "Budget vs Actual",    href: "/planning/reports/budget-vs-actual" },
        { label: "Job Costing Report",  href: "/planning/reports/job-costing" },
      ]},
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
      { label: "Reports", isGroup: true, items: [
        { label: "Site Profitability",  href: "/construction/reports/site-profitability-report" },
        { label: "Progress Report",     href: "/construction/reports/progress-report" },
      ]},
    ],
  },
  {
    title: "Procurement & Stock",
    items: [
      { label: "Overview",              href: "/procurement" },
      { label: "PR/PO Management",      href: "/procurement/pr-po" },
      { label: "Logistics",             href: "/procurement/logistics" },
      { label: "Inventory",             href: "/procurement/inventory" },
      { label: "Reports", isGroup: true, items: [
        { label: "Procurement Reports", href: "/procurement/reports" },
      ]},
    ],
  },
  {
    title: "Batching Plant",
    items: [
      { label: "Overview",     href: "/batching" },
      { label: "Setup", isGroup: true, items: [
        { label: "Mix Design Register", href: "/batching/recipes" },
      ]},
      { label: "Production", isGroup: true, items: [
        { label: "IPO Queue",           href: "/batching/ipo" },
        { label: "Material Receiving",  href: "/batching/mrr" },
        { label: "Production Logs",     href: "/batching/production" },
        { label: "Yield Analysis",      href: "/batching/yield" },
      ]},
      { label: "Delivery", isGroup: true, items: [
        { label: "Dispatch",            href: "/batching/dispatch" },
        { label: "Pending Deliveries",  href: "/batching/deliver" },
        { label: "Internal Sales",      href: "/batching/internal-sales" },
      ]},
      { label: "Admin", isGroup: true, items: [
        { label: "Plant Manpower",      href: "/batching/manpower" },
        { label: "Batching Reports",    href: "/batching/reports" },
      ]},
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
      { label: "Reports", isGroup: true, items: [
        { label: "Fleet Reports",       href: "/motorpool/reports" },
      ]},
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
      { label: "Reports", isGroup: true, items: [
        { label: "Audit Reports",       href: "/audit/reports" },
      ]},
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
      { label: "Reports", isGroup: true, items: [
        { label: "P&L by Dept",           href: "/finance/reports/profit-and-loss" },
        { label: "Balance Sheet",         href: "/finance/reports/balance-sheet" },
        { label: "Cash Flow Projections", href: "/finance/reports/cash-flow" },
        { label: "General Ledger",        href: "/finance/reports/ledger" },
        { label: "Trial Balance",         href: "/finance/reports/trial-balance" },
        { label: "Vendor Summary",        href: "/finance/reports/vendor-summary" },
        { label: "Developer Summary",     href: "/finance/reports/developer-summary" },
        { label: "Aged Payables",         href: "/finance/reports/aged-payables" },
        { label: "Aged Receivables",      href: "/finance/reports/aged-receivables" },
      ]},
    ],
  },
  {
    title: "HR & Payroll",
    items: [
      { label: "Overview",            href: "/hr" },
      { label: "Employee Registry",   href: "/hr/registry" },
      { label: "Payroll Processor",   href: "/hr/payroll" },
      { label: "Leave Management",    href: "/hr/leaves" },
      { label: "Reports", isGroup: true, items: [
        { label: "Employee List",     href: "/hr/reports/employee-list" },
      ]},
    ],
  },
  {
    title: "Master List",
    items: [
      { label: "Overview",                   href: "/master-list" },
      { label: "Projects / Sites",           href: "/master-list/projects" },
      { label: "Construction Phases",        href: "/master-list/construction-phases" },
      { label: "Material List",              href: "/master-list/materials" },
      { label: "Vendors",                    href: "/master-list/vendors" },
      { label: "Subcontractors",             href: "/master-list/subcontractors" },
      { label: "Developers",                 href: "/master-list/developers" },
      { label: "Departments & Cost Centers", href: "/master-list/departments" },
      { label: "Import Data",                href: "/master-list/import" },
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

const OVERVIEW_HREFS = new Set([
  "/planning", "/construction", "/procurement", "/batching",
  "/motorpool", "/audit", "/finance", "/hr", "/main-dashboard", "/master-list",
]);

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
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

  // Which top-level section is active
  const activeSection = NAV.find((s) =>
    s.items.some((item) => {
      if (item.isGroup) return item.items.some((i) => isActive(i.href));
      if (item.href)    return isActive(item.href);
      return false;
    })
  )?.title;

  // Which sub-groups are active (auto-open)
  const activeGroupKeys = new Set<string>();
  NAV.forEach((section) => {
    section.items.forEach((item) => {
      if (item.isGroup && item.items.some((i) => isActive(i.href))) {
        activeGroupKeys.add(`${section.title}::${item.label}`);
      }
    });
  });

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(activeSection ? [activeSection] : [NAV[0].title])
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(activeGroupKeys));

  function toggleSection(title: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
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
        <button onClick={onClose} className="mobile-only" style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: C.muted, padding: "0.25rem",
        }} aria-label="Close navigation">
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
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Executive Overview
        </Link>

        <div style={{ height: "1px", background: C.border, margin: "0.25rem 0 0.5rem" }} />

        {NAV.map((section) => {
          const isOpen = openSections.has(section.title);
          const hasCurrent = section.items.some((item) => {
            if (item.isGroup) return item.items.some((i) => isActive(i.href));
            if (item.href)    return isActive(item.href);
            return false;
          });

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
                    // Collapsible sub-group
                    if (item.isGroup) {
                      const groupKey = `${section.title}::${item.label}`;
                      const groupOpen = openGroups.has(groupKey);
                      const groupHasCurrent = item.items.some((i) => isActive(i.href));

                      return (
                        <div key={`group-${idx}`}>
                          <button onClick={() => toggleGroup(groupKey)} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            width: "100%", padding: "0.35rem 1rem 0.35rem 1.5rem",
                            background: "transparent", border: "none", cursor: "pointer",
                            color: groupHasCurrent ? "#93c5fd" : "#52525b",
                            fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em",
                            textTransform: "uppercase", textAlign: "left",
                          }}>
                            <span>{item.label}</span>
                            <Chevron open={groupOpen} />
                          </button>
                          {groupOpen && (
                            <div>
                              {item.items.map((link) => {
                                const active = isActive(link.href);
                                return (
                                  <Link key={link.href} href={link.href} onClick={onClose} style={{
                                    display: "block",
                                    padding: "0.38rem 1rem 0.38rem 2.25rem",
                                    textDecoration: "none", fontSize: "0.78rem",
                                    color: active ? "#fff" : C.muted,
                                    background: active ? C.activeBg : "transparent",
                                    borderLeft: active ? `3px solid ${C.active}` : "3px solid transparent",
                                    fontWeight: active ? 600 : 400,
                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                  }}>
                                    {link.label}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Static divider
                    if (item.isDivider) {
                      return (
                        <div key={`div-${idx}`} style={{
                          display: "flex", alignItems: "center", gap: "0.4rem",
                          padding: "0.5rem 1rem 0.25rem 1.75rem", marginTop: "0.25rem",
                        }}>
                          <div style={{ flex: 1, height: "1px", background: C.border }} />
                          <span style={{
                            fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em",
                            textTransform: "uppercase", color: "#52525b", whiteSpace: "nowrap",
                          }}>{item.label}</span>
                          <div style={{ flex: 1, height: "1px", background: C.border }} />
                        </div>
                      );
                    }

                    // Regular link
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
