"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Sidebar color palette (matches globals.css CSS variables) ──────────────
const C = {
  bg:          "#18181b",  // hsl(240 5.9% 10%)
  fg:          "#f4f4f5",  // hsl(240 4.8% 95.9%)
  accent:      "#27272a",  // hsl(240 3.7% 15.9%)
  border:      "#27272a",
  muted:       "#a1a1aa",  // hsl(240 5% 64.9%)
  active:      "#1d4ed8",  // blue active indicator
  activeBg:    "rgba(59,130,246,0.15)",
} as const;

// ── Navigation tree ────────────────────────────────────────────────────────
const NAV = [
  {
    title: "Planning & Engineering",
    items: [
      { label: "Overview",        href: "/planning" },
      { label: "Scope of Work",   href: "/planning/sow" },
      { label: "Bill of Materials", href: "/planning/bom" },
      { label: "Issue NTP",       href: "/planning/issue-ntp" },
      { label: "Materials Master", href: "/planning/materials" },
      { label: "Vendors",         href: "/planning/vendors" },
      { label: "Subcontractors",  href: "/planning/subcontractors" },
      { label: "Developers",      href: "/planning/developers" },
    ],
  },
  {
    title: "Construction",
    items: [
      { label: "Overview",        href: "/construction" },
      { label: "Sites",           href: "/construction/sites" },
      { label: "NTP Register",    href: "/construction/ntp" },
      { label: "Daily Progress",  href: "/construction/daily-progress" },
      { label: "Log Progress",    href: "/construction/log-progress" },
      { label: "Submit WAR",      href: "/construction/submit-war" },
    ],
  },
  {
    title: "Procurement & Stock",
    items: [
      { label: "Overview",        href: "/procurement" },
      { label: "Purchase Requests", href: "/procurement/pr" },
      { label: "Purchase Orders", href: "/procurement/po" },
      { label: "Inventory",       href: "/procurement/inventory" },
      { label: "Receipts",        href: "/procurement/receipts" },
      { label: "Vendors",         href: "/procurement/vendors" },
      { label: "Price Change",    href: "/procurement/price-change" },
    ],
  },
  {
    title: "Batching Plant",
    items: [
      { label: "Overview",        href: "/batching" },
      { label: "Production",      href: "/batching/production" },
      { label: "Mix Designs",     href: "/batching/mix-designs" },
      { label: "Yield Report",    href: "/batching/yield" },
      { label: "Internal Sales",  href: "/batching/internal-sales" },
      { label: "Log Batch",       href: "/batching/log-batch" },
    ],
  },
  {
    title: "Motorpool",
    items: [
      { label: "Overview",        href: "/motorpool" },
      { label: "Equipment Register", href: "/motorpool/equipment" },
      { label: "Rentals",         href: "/motorpool/rental" },
      { label: "Fuel Logs",       href: "/motorpool/fuel" },
      { label: "Fix or Flip",     href: "/motorpool/fix-or-flip" },
      { label: "Manpower",        href: "/motorpool/manpower" },
      { label: "Add Equipment",   href: "/motorpool/add-equipment" },
      { label: "Assign Equipment", href: "/motorpool/assign" },
      { label: "Log Fuel",        href: "/motorpool/log-fuel" },
    ],
  },
  {
    title: "Audit & Quality",
    items: [
      { label: "Overview",        href: "/audit" },
      { label: "PO Compliance",   href: "/audit/po-compliance" },
      { label: "Triple Match",    href: "/audit/triple-match" },
      { label: "Inspections",     href: "/audit/inspections" },
    ],
  },
  {
    title: "Finance & Accounting",
    items: [
      { label: "Overview",        href: "/finance" },
      { label: "Invoices",        href: "/finance/invoices" },
      { label: "Payables",        href: "/finance/payables" },
      { label: "Banking",         href: "/finance/banking" },
      { label: "RFP",             href: "/finance/rfp" },
      { label: "P&L by Dept",     href: "/finance/pnl-dept" },
      { label: "Cash Flow",       href: "/finance/cash-flow" },
      { label: "Cost Center",     href: "/finance/cost-center" },
    ],
  },
  {
    title: "HR & Payroll",
    items: [
      { label: "Overview",        href: "/hr" },
      { label: "Employee Registry", href: "/hr/registry" },
      { label: "DTR Upload",      href: "/hr/dtr-upload" },
      { label: "Payroll",         href: "/hr/payroll" },
      { label: "Leave Management", href: "/hr/leaves" },
      { label: "Add Employee",    href: "/hr/add-employee" },
      { label: "Log DTR",         href: "/hr/log-dtr" },
      { label: "Record Leave",    href: "/hr/record-leave" },
    ],
  },
] as const;

// ── Chevron SVG ────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{
        transition: "transform 0.2s",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        flexShrink: 0,
      }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────
interface AppSidebarProps {
  displayName: string;
  deptCode: string;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function AppSidebar({ displayName, deptCode }: AppSidebarProps) {
  const pathname = usePathname();

  // Auto-open the section containing the active route
  const activeSection = NAV.find((s) =>
    s.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
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

  function isActive(href: string) {
    if (href === "/planning" || href === "/construction" || href === "/procurement" ||
        href === "/batching" || href === "/motorpool" || href === "/audit" ||
        href === "/finance" || href === "/hr") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside style={{
      width: "240px",
      minWidth: "240px",
      height: "100vh",
      background: C.bg,
      color: C.fg,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      borderRight: `1px solid ${C.border}`,
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Brand */}
      <div style={{
        padding: "0 1rem",
        height: "56px",
        display: "flex",
        alignItems: "center",
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}>
          Castcrete 360
        </span>
      </div>

      {/* Nav scroll area */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>
        {/* Main Dashboard */}
        <Link
          href="/main-dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0.5rem 1rem",
            marginBottom: "0.25rem",
            borderRadius: "0",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: isActive("/main-dashboard") ? "#fff" : C.fg,
            background: isActive("/main-dashboard") ? C.activeBg : "transparent",
            borderLeft: isActive("/main-dashboard") ? `3px solid ${C.active}` : "3px solid transparent",
            gap: "0.5rem",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Main Dashboard
        </Link>

        {/* Section separator */}
        <div style={{ height: "1px", background: C.border, margin: "0.25rem 0 0.5rem" }} />

        {/* Collapsible sections */}
        {NAV.map((section) => {
          const isOpen = openSections.has(section.title);
          const hasCurrent = section.items.some((item) => isActive(item.href));

          return (
            <div key={section.title}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.title)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "0.45rem 1rem",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: hasCurrent ? "#fff" : C.muted,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  textAlign: "left",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {section.title}
                </span>
                <Chevron open={isOpen} />
              </button>

              {/* Sub-items */}
              {isOpen && (
                <div style={{ marginBottom: "0.25rem" }}>
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        style={{
                          display: "block",
                          padding: "0.4rem 1rem 0.4rem 1.75rem",
                          textDecoration: "none",
                          fontSize: "0.8rem",
                          color: active ? "#fff" : C.muted,
                          background: active ? C.activeBg : "transparent",
                          borderLeft: active ? `3px solid ${C.active}` : "3px solid transparent",
                          fontWeight: active ? 600 : 400,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
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

      {/* User info + sign out */}
      <div style={{
        padding: "0.75rem 1rem",
        borderTop: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: C.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </div>
          {deptCode && (
            <div style={{
              display: "inline-block",
              marginTop: "0.2rem",
              padding: "0.1rem 0.45rem",
              background: "rgba(29,78,216,0.3)",
              color: "#93c5fd",
              borderRadius: "999px",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}>
              {deptCode}
            </div>
          )}
        </div>
        <form method="POST" action="/auth/logout" style={{ margin: 0 }}>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "0.4rem 0",
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: "6px",
              color: C.muted,
              fontSize: "0.75rem",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
