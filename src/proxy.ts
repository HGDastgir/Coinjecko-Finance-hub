import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  buildContentSecurityPolicy,
  generateNonce,
  securityHeaders,
} from "@/lib/security/headers";
import { clientIpFromHeaders } from "@/lib/security/client-ip";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { defaultLocale, isLocale, negotiateLocale } from "@/i18n/config";
import { publicEnv } from "@/lib/env";

/**
 * Request pipeline (Next.js 16 proxy — successor to middleware):
 *
 * 1. rate limiting for /api/* (backstop; CDN/WAF is the primary layer)
 * 2. locale negotiation and /en | /ur path prefixing
 * 3. Supabase session refresh (when configured)
 * 4. admin route gate — unauthenticated users never reach /admin UI
 * 5. nonce-based CSP + security headers on every response
 */

const isDev = process.env.NODE_ENV !== "production";

const PUBLIC_FILE = /\.[^/]+$/;

function clientIp(request: NextRequest): string {
  // Never an auth signal — a rate-limit grouping key only. See
  // src/lib/security/client-ip.ts for why this reads from the right.
  return clientIpFromHeaders((name) => request.headers.get(name));
}

function buildCsp(nonce: string, mode: "strict-nonce" | "static-site") {
  const connectOrigins: string[] = [];
  const imageOrigins: string[] = [];
  if (publicEnv.NEXT_PUBLIC_SUPABASE_URL) {
    const origin = new URL(publicEnv.NEXT_PUBLIC_SUPABASE_URL).origin;
    connectOrigins.push(origin);
    // Supabase realtime uses a websocket on the same host.
    connectOrigins.push(origin.replace(/^http/, "ws"));
    // Editorial artwork is served from Storage on the same host.
    imageOrigins.push(origin);
  }
  return buildContentSecurityPolicy({
    nonce,
    isDev,
    mode,
    connectOrigins,
    imageOrigins,
    // Ads exist only when a publisher id is configured, so the policy
    // widens for exactly the deployments that serve them.
    adsEnabled: Boolean(publicEnv.NEXT_PUBLIC_ADSENSE_CLIENT),
  });
}

function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
  mode: "strict-nonce" | "static-site",
): void {
  response.headers.set("Content-Security-Policy", buildCsp(nonce, mode));
  for (const [name, value] of Object.entries(securityHeaders(isDev))) {
    response.headers.set(name, value);
  }
}

/** Privileged surfaces are dynamically rendered under the strict
 *  nonce CSP; the static public site uses the documented
 *  static-site policy (see src/lib/security/headers.ts). */
function cspModeFor(segments: string[]): "strict-nonce" | "static-site" {
  const section = segments[2];
  return section === "admin" || section === "sign-in"
    ? "strict-nonce"
    : "static-site";
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const nonce = generateNonce();

  // --- 1. API rate limiting -------------------------------------
  if (pathname.startsWith("/api/")) {
    const result = rateLimit(`api:${clientIp(request)}`, RATE_LIMITS.api);
    if (!result.success) {
      const res = NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      );
      res.headers.set(
        "Retry-After",
        String(Math.ceil(result.retryAfterMs / 1000)),
      );
      applySecurityHeaders(res, nonce, "static-site");
      return res;
    }
    const res = NextResponse.next();
    applySecurityHeaders(res, nonce, "static-site");
    return res;
  }

  // --- 2. Locale prefixing --------------------------------------
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (!isLocale(maybeLocale) && !PUBLIC_FILE.test(pathname)) {
    const locale =
      negotiateLocale(request.headers.get("accept-language")) ?? defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const res = NextResponse.redirect(url, 308);
    applySecurityHeaders(res, nonce, "static-site");
    return res;
  }

  const cspMode = cspModeFor(segments);

  // --- 3 + 4. Session refresh and admin gate --------------------
  // The nonce travels to the app via a request header so Server
  // Components can read it; for strict-nonce surfaces the CSP is
  // also set on the REQUEST so Next.js nonce-annotates its own
  // framework <script> tags during dynamic rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  if (cspMode === "strict-nonce") {
    requestHeaders.set("Content-Security-Policy", buildCsp(nonce, cspMode));
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabaseUrl = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isAdminPath = isLocale(maybeLocale) && segments[2] === "admin";

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: !isDev,
              sameSite: "lax",
            });
          }
        },
      },
    });

    // Refreshes the session cookie when expired; getUser() validates
    // the JWT against the auth server (do not trust getSession()).
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isAdminPath && !user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${maybeLocale}/sign-in`;
      url.search = `?next=${encodeURIComponent(pathname)}`;
      const res = NextResponse.redirect(url);
      applySecurityHeaders(res, nonce, cspMode);
      return res;
    }
  } else if (isAdminPath) {
    // Fail closed: no auth backend configured means no admin surface.
    const url = request.nextUrl.clone();
    url.pathname = `/${maybeLocale}`;
    url.search = "";
    const res = NextResponse.redirect(url);
    applySecurityHeaders(res, nonce, cspMode);
    return res;
  }

  // --- 5. Security headers --------------------------------------
  applySecurityHeaders(response, nonce, cspMode);
  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|robots\\.txt|sitemap\\.xml).*)",
  ],
};
