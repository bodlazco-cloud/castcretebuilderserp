import type { ReactNode } from "react";
import ErpShell from "@/components/ErpShell";
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
    <ErpShell displayName={displayName} deptCode={deptCode}>
      {children}
    </ErpShell>
  );
}
