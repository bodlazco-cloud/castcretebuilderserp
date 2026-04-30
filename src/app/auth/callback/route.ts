import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Supabase Auth callback — handles the code exchange after:
 *   - Magic link clicks
 *   - OAuth provider redirects
 *   - Email confirmation links
 *
 * Supabase redirects here with ?code=... after authentication.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code        = searchParams.get("code");
  const redirectTo  = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
}
