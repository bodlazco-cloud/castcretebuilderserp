"use client";

import { useState } from "react";
import { Bell, Menu, X, AlertTriangle } from "lucide-react";
import AppSidebar from "./AppSidebar";

interface ErpShellProps {
  children: React.ReactNode;
  displayName: string;
  deptCode: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";
}

export default function ErpShell({ children, displayName, deptCode }: ErpShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

      {/* ── TOP HEADER ─────────────────────────────────────────────── */}
      <header
        className="no-print"
        style={{
          height: "56px", flexShrink: 0,
          background: "#fff", borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 1rem", zIndex: 50,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {/* LEFT: toggle + brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Mobile hamburger */}
          <button
            className="mobile-only"
            onClick={() => setMobileOpen(true)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: "0.35rem", color: "#374151", borderRadius: "6px",
            }}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          {/* Desktop collapse */}
          <button
            className="desktop-only"
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: "0.35rem", color: "#374151", borderRadius: "6px",
              display: "flex", alignItems: "center",
            }}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Brand */}
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em", color: "#1e293b" }}>
              CASTCRETE <span style={{ color: "#1d4ed8" }}>360</span>
            </div>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8" }}>
              Enterprise Resource Planning
            </div>
          </div>
        </div>

        {/* RIGHT: status + bell + user */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* System status */}
          <div
            className="desktop-only"
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.25rem 0.75rem",
              background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "999px",
            }}
          >
            <AlertTriangle size={12} color="#d97706" />
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#92400e" }}>5M Buffer Secured</span>
          </div>

          {/* Notifications bell */}
          <button
            style={{
              position: "relative", background: "transparent", border: "none",
              cursor: "pointer", padding: "0.35rem", color: "#64748b", borderRadius: "6px",
              display: "flex", alignItems: "center",
            }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span style={{
              position: "absolute", top: "4px", right: "4px",
              width: "8px", height: "8px", background: "#ef4444",
              borderRadius: "50%", border: "2px solid #fff",
            }} />
          </button>

          {/* User avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", paddingLeft: "0.75rem", borderLeft: "1px solid #e5e7eb" }}>
            <div className="desktop-only" style={{ textAlign: "right", lineHeight: 1.2 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>{displayName}</div>
              {deptCode && (
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {deptCode}
                </div>
              )}
            </div>
            <div style={{
              width: "34px", height: "34px", background: "#1d4ed8", borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: "0.72rem", fontWeight: 700, flexShrink: 0,
              boxShadow: "0 2px 6px rgba(29,78,216,0.3)",
            }}>
              {initials(displayName)}
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY (sidebar + content) ────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 99 }}
          />
        )}

        <AppSidebar
          displayName={displayName}
          deptCode={deptCode}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          desktopOpen={sidebarOpen}
        />

        <div className="erp-content">
          {children}
        </div>
      </div>
    </div>
  );
}
