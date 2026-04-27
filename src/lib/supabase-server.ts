import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components and Route Handlers.
 * Reads/writes the auth session from cookies automatically.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()          { return cookieStore.getAll(); },
        setAll(toSet)     {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}

/**
 * Returns the currently authenticated user, or null if not signed in.
 * Use this in Server Components / Server Actions instead of getSession()
 * (getUser() validates the JWT against Supabase on every call — more secure).
 */
export async function getAuthUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}
