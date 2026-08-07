/**
 * Client address resolution for rate-limit keys.
 *
 * `X-Forwarded-For` is client-writable. A request that arrives already
 * carrying `X-Forwarded-For: 1.2.3.4` reaches us as
 * `1.2.3.4, <real client>` once the edge appends — so the LEFTMOST
 * entry is whatever the caller chose to send. Keying a rate limiter on
 * it means an attacker mints a fresh bucket per request: the limit is
 * evaded, and because every forged value is a new map key the store
 * fills to its cap, after which the limiter fails open for everyone.
 *
 * Two rules follow:
 *
 * 1. Prefer a header only the edge can set. Cloudflare's
 *    `cf-connecting-ip` and nginx's `x-real-ip` are overwritten by the
 *    proxy on every request, so a forged copy never survives.
 * 2. Otherwise read `X-Forwarded-For` from the RIGHT. The rightmost
 *    entry was appended by the proxy closest to us; entries further
 *    left came from further out and are progressively less trustworthy.
 *    `trustedHops` says how many proxies sit in front of the app.
 *
 * None of this is an authentication signal — it is a best-effort
 * grouping key, and the CDN/WAF remains the primary flood control.
 */

export type HeaderReader = (name: string) => string | null | undefined;

/** Headers a trusted edge sets itself, in order of preference. */
const EDGE_HEADERS = ["cf-connecting-ip", "x-real-ip"] as const;

export const UNKNOWN_CLIENT = "unknown";

export function clientIpFromHeaders(
  getHeader: HeaderReader,
  trustedHops = 1,
): string {
  for (const header of EDGE_HEADERS) {
    const value = getHeader(header)?.trim();
    if (value) return value;
  }

  const forwarded = getHeader("x-forwarded-for");
  if (!forwarded) return UNKNOWN_CLIENT;

  const entries = forwarded
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return UNKNOWN_CLIENT;

  // Count back from the right by the number of proxies we trust; clamp
  // so a short header cannot walk us off the front of the list into
  // caller-controlled territory.
  const hops = Math.max(1, trustedHops);
  const index = Math.max(0, entries.length - hops);
  return entries[index] ?? UNKNOWN_CLIENT;
}
