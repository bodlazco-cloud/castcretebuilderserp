import type { ReactNode } from "react";
import AppSidebar from "@/components/AppSidebar";
import { getAuthUser } from "@/lib/supabase-server";

export default async function ErpLayout({ children }: { children: ReactNode }) {
  let displayName = "Guest";
  let deptCode = "";

  try {
    const user = await getAuthUser();
    displayName = user?.user_metadata?.full_name ?? user?.email ?? "Guest";
    deptCode = user?.user_metadata?.dept_code ?? "";
  } catch {
    // Supabase not configured — show layout anyway
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <AppSidebar displayName={displayName} deptCode={deptCode} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
