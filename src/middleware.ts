import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Route prefix → dept_codes that may access it. ADMIN and BOD always bypass.
// Longest-prefix match wins when a path matches multiple entries.
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/main-dashboard": ["ADMIN", "BOD"],
  "/master-list":    ["ADMIN", "BOD"],
  "/admin":          ["ADMIN", "BOD"],
  "/planning":       ["PLANNING", "AUDIT", "ADMIN", "BOD"],
  "/construction":   ["CONSTRUCTION", "PLANNING", "AUDIT", "ADMIN", "BOD"],
  "/procurement":    ["PROCUREMENT", "PLANNING", "AUDIT", "FINANCE", "ADMIN", "BOD"],
  "/batching":       ["BATCHING", "AUDIT", "PLANNING", "ADMIN", "BOD"],
  "/motorpool":      ["MOTORPOOL", "AUDIT", "ADMIN", "BOD"],
  "/finance":        ["FINANCE", "AUDIT", "ADMIN", "BOD"],
  "/hr":             ["HR", "ADMIN", "BOD"],
  "/audit":          ["AUDIT", "ADMIN", "BOD"],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Skip auth when Supabase is not configured (local dev)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll()          { return request.cookies.getAll(); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(toSet: { name: string; value: string; options?: any }[]) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Validate the JWT against Supabase on every request
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    if (user && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/main-dashboard", request.url));
    }
    return response;
  }

  // Require authentication on all other routes
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Department-level route protection
  const deptCode: string = user.user_metadata?.dept_code ?? "";

  const matchedRoute = Object.keys(ROUTE_PERMISSIONS)
    .filter((route) => pathname.startsWith(route))
    .sort((a, b) => b.length - a.length)[0]; // longest prefix wins

  if (matchedRoute) {
    const allowed = ROUTE_PERMISSIONS[matchedRoute];
    if (!allowed.includes(deptCode)) {
      const dest = new URL("/main-dashboard", request.url);
      dest.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(dest);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
