import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─── Route → minimum allowed dept_codes ──────────────────────────────────────
// Any dept not listed is denied. ADMIN and BOD bypass all checks.
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/dashboard":           ["PLANNING","AUDIT","CONSTRUCTION","PROCUREMENT","BATCHING","MOTORPOOL","FINANCE","HR","ADMIN","BOD"],
  "/planning":            ["PLANNING","AUDIT","ADMIN","BOD"],
  "/construction":        ["CONSTRUCTION","PLANNING","AUDIT","ADMIN","BOD"],
  "/procurement":         ["PROCUREMENT","PLANNING","AUDIT","FINANCE","ADMIN","BOD"],
  "/batching":            ["BATCHING","AUDIT","PLANNING","ADMIN","BOD"],
  "/motorpool":           ["MOTORPOOL","AUDIT","ADMIN","BOD"],
  "/finance":             ["FINANCE","AUDIT","ADMIN","BOD"],
  "/hr":                  ["HR","ADMIN","BOD"],
  "/audit":               ["AUDIT","ADMIN","BOD"],
  "/settings":            ["ADMIN","BOD"],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Skip auth entirely when Supabase env vars are not configured (local dev without Supabase)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll()          { return request.cookies.getAll(); },
        setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refresh session — required for Server Components to read auth state
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes: login page and API auth callbacks
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    // Redirect authenticated users away from the login page
    if (user && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // All other routes require authentication
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Department-level route protection ────────────────────────────────────
  const deptCode: string = user.user_metadata?.dept_code ?? "";

  // Find the most-specific matching route prefix
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS)
    .filter((route) => pathname.startsWith(route))
    .sort((a, b) => b.length - a.length)[0];  // longest match wins

  if (matchedRoute) {
    const allowed = ROUTE_PERMISSIONS[matchedRoute];
    if (!allowed.includes(deptCode)) {
      // Redirect to dashboard with an error flag rather than showing a blank 403
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except static files, _next internals, and favicon
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
