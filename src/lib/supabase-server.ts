import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, departments } from "@/db/schema";
import { eq } from "drizzle-orm";

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(toSet: { name: string; value: string; options?: any }[]) {
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

/** Returns true if the logged-in user has ADMIN or BOD role in the DB users table. */
export async function isAdminOrBod(): Promise<boolean> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return false;
  try {
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.email, authUser.email));
    if (!dbUser) return false;
    return dbUser.role === "ADMIN" || dbUser.role === "BOD";
  } catch {
    return false;
  }
}

/**
 * Returns true if the user can approve daily progress entries:
 * - ADMIN or BOD (always), OR
 * - role = MANAGER in the CONSTRUCTION department
 */
export async function canApproveProgressEntries(): Promise<boolean> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return false;
  try {
    const [row] = await db
      .select({ role: users.role, deptCode: departments.code })
      .from(users)
      .leftJoin(departments, eq(users.deptId, departments.id))
      .where(eq(users.email, authUser.email));
    if (!row) return false;
    if (row.role === "ADMIN" || row.role === "BOD") return true;
    return row.role === "MANAGER" && row.deptCode === "CONSTRUCTION";
  } catch {
    return false;
  }
}
