import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { siteUrl } from "@/lib/request-url";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(siteUrl(request, "/login"));
}
