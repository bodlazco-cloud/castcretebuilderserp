"use client";

import { useState } from "react";
import AppSidebar from "./AppSidebar";

interface ErpShellProps {
  children: React.ReactNode;
  displayName: string;
  deptCode: string;
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6"  x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export default function ErpShell({ children, displayName, deptCode }: ErpShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Mobile top bar */}
      <div className="mobile-topbar no-print">
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "#f4f4f5", padding: "0.25rem", display: "flex", alignItems: "center",
          }}
          aria-label="Open navigation"
        >
          <HamburgerIcon />
        </button>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f4f4f5", letterSpacing: "-0.01em" }}>
          Castcrete 360
        </span>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 99,
          }}
        />
      )}

      <AppSidebar
        displayName={displayName}
        deptCode={deptCode}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="erp-content">
        {children}
      </div>
    </div>
  );
}
