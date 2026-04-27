import { NextRequest } from "next/server";

/**
 * Build a redirect URL that works behind Replit's reverse proxy.
 * request.url resolves to http://0.0.0.0:5000 in that environment,
 * so we prefer x-forwarded-host / x-forwarded-proto when available.
 */
export function siteUrl(request: NextRequest, path: string): URL {
  const forwardedHost  = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return new URL(path, `${forwardedProto}://${forwardedHost}`);
  }

  // Fallback: env var, then request.url
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return new URL(path, appUrl);

  return new URL(path, request.url);
}
