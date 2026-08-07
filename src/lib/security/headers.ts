/**
 * Security headers + Content Security Policy.
 *
 * TWO CSP TIERS (documented trade-off):
 *
 * 1. "strict-nonce" — privileged, dynamically rendered surfaces
 *    (/admin, /sign-in). Per-request nonce + 'strict-dynamic'; the
 *    nonce is also placed on the REQUEST Content-Security-Policy
 *    header so Next.js annotates its own framework scripts with it.
 *
 * 2. "static-site" — all public, statically prerendered pages.
 *    Build-time HTML cannot carry a per-request nonce, and with
 *    'strict-dynamic' present browsers ignore 'self' — which blocks
 *    every framework script and breaks hydration entirely. So static
 *    pages use script-src 'self' 'unsafe-inline': 'unsafe-inline' is
 *    REQUIRED for Next.js's bootstrap inline scripts in prerendered
 *    HTML. Mitigation: these pages render no user-generated HTML
 *    (React output-encodes everything); routes that ever display
 *    user-submitted content must move to dynamic rendering under the
 *    strict-nonce tier.
 *
 * Other documented exceptions:
 * - style-src keeps 'unsafe-inline' (Next.js streams inline <style>).
 * - script-src adds 'unsafe-eval' in DEVELOPMENT ONLY (React Refresh).
 * - Every third-party origin must be explicitly allow-listed here and
 *   reviewed before being added. Start closed.
 */

const SELF = "'self'";

export type CspMode = "strict-nonce" | "static-site";

export interface CspOptions {
  nonce: string;
  isDev: boolean;
  mode: CspMode;
  /** e.g. Supabase project origin for auth/API/websocket calls. */
  connectOrigins?: string[];
}

export function buildContentSecurityPolicy({
  nonce,
  isDev,
  mode,
  connectOrigins = [],
}: CspOptions): string {
  const connect = [SELF, ...connectOrigins].join(" ");

  const scriptSrc =
    mode === "strict-nonce"
      ? `script-src ${SELF} 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`
      : `script-src ${SELF} 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`;

  const directives = [
    `default-src ${SELF}`,
    scriptSrc,
    `style-src ${SELF} 'unsafe-inline'`,
    `img-src ${SELF} data: blob:`,
    `font-src ${SELF}`,
    `connect-src ${connect}${isDev ? " ws:" : ""}`,
    `media-src ${SELF}`,
    `object-src 'none'`,
    `base-uri ${SELF}`,
    `form-action ${SELF}`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

export function securityHeaders(isDev: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    "X-DNS-Prefetch-Control": "off",
    "Cross-Origin-Opener-Policy": "same-origin",
  };
  if (!isDev) {
    headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";
  }
  return headers;
}

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
