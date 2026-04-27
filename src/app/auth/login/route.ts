import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const formData  = await request.formData();
  const email     = formData.get("email")    as string;
  const password  = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string | null;

  const destination = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";

  if (!email || !password) {
    return NextResponse.redirect(
      new URL(`/login?error=missing_fields`, request.url),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const params = new URLSearchParams({ error: "invalid_credentials" });
    if (redirectTo) params.set("redirectTo", redirectTo);
    return NextResponse.redirect(new URL(`/login?${params}`, request.url));
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
