/**
 * Which campaign belongs in which slot.
 *
 * Deliberately dependency-free, like ad-placements.ts beside it: this
 * is the one definition of what "this ad runs on /blog" means, and it
 * is imported by the public renderer, by the admin form and by the
 * tests. A second, slightly different matcher living in the UI is
 * exactly how a campaign ends up billed but invisible.
 */

import type { AdPlacement } from "@/content/ad-placements";

/**
 * Where a campaign may be booked.
 *
 * `null` is "every page". Every other entry is a locale-less path
 * prefix, and the list is limited to sections that actually render an
 * ad slot — offering a scope with no inventory behind it would sell
 * space that silently never appears.
 */
export const AD_SCOPES: readonly { value: string | null; label: string }[] = [
  { value: null, label: "Every page" },
  { value: "/", label: "Homepage only" },
  { value: "/blog", label: "Blog" },
  { value: "/vlogs", label: "Vlogs" },
  { value: "/breaking-news", label: "Breaking news" },
  { value: "/markets", label: "Markets" },
  { value: "/crypto", label: "Crypto" },
  { value: "/forex", label: "Forex" },
  { value: "/commodities", label: "Commodities" },
  { value: "/economy", label: "Economy" },
  { value: "/dashboard", label: "Dashboard" },
  { value: "/business", label: "Business" },
  { value: "/personal-finance", label: "Personal finance" },
];

const SCOPE_VALUES = new Set(
  AD_SCOPES.map((scope) => scope.value).filter(
    (value): value is string => value !== null,
  ),
);

export function isAdScope(value: unknown): value is string {
  return typeof value === "string" && SCOPE_VALUES.has(value);
}

/** Human label for a stored scope, for the admin list. */
export function describeScope(scope: string | null): string {
  return (
    AD_SCOPES.find((entry) => entry.value === scope)?.label ??
    scope ??
    "Every page"
  );
}

/**
 * Does a campaign's scope cover this page?
 *
 * `path` is locale-less — "/blog/some-post", not "/en/blog/some-post"
 * — so one booking covers both language editions.
 *
 * A bare "/" is the homepage and matches only itself. Treating it as a
 * prefix would make it match every path on the site, turning the
 * narrowest possible booking into the widest.
 */
export function scopeMatchesPath(scope: string | null, path: string): boolean {
  if (scope === null) return true;
  if (scope === "/") return path === "/";
  if (path === scope) return true;
  return path.startsWith(`${scope}/`);
}

/** The fields targeting needs. The full row carries more. */
export interface TargetableAd {
  placement: AdPlacement;
  locale: string | null;
  pageScope: string | null;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
}

/**
 * Is the campaign inside its booked flight window?
 *
 * An absent bound is open-ended in that direction, which is how a
 * campaign with no agreed end date is expressed. Unparseable dates
 * count as out of window: a campaign whose schedule cannot be read is
 * one nobody can prove should be running.
 */
export function isWithinFlight(ad: TargetableAd, now: Date): boolean {
  if (ad.startsAt !== null) {
    const start = Date.parse(ad.startsAt);
    if (Number.isNaN(start) || now.getTime() < start) return false;
  }
  if (ad.endsAt !== null) {
    const end = Date.parse(ad.endsAt);
    if (Number.isNaN(end) || now.getTime() >= end) return false;
  }
  return true;
}

/**
 * The single campaign to render, or null to fall through to AdSense.
 *
 * Ordering is explicit rather than left to the database: highest
 * priority wins, and a tie is broken by the more specific booking, so
 * a campaign bought for /blog beats a run-of-site campaign on the blog
 * without the buyer having to know to set a priority. The final tie
 * break is the id, purely so the result is stable across renders
 * instead of flickering between two equal candidates on each ISR pass.
 */
export function selectAd<T extends TargetableAd & { id: string }>(
  ads: readonly T[],
  context: {
    placement: AdPlacement;
    locale: string;
    path: string;
    now?: Date;
  },
): T | null {
  const now = context.now ?? new Date();

  const eligible = ads.filter(
    (ad) =>
      ad.placement === context.placement &&
      (ad.locale === null || ad.locale === context.locale) &&
      scopeMatchesPath(ad.pageScope, context.path) &&
      isWithinFlight(ad, now),
  );

  if (eligible.length === 0) return null;

  return [...eligible].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const specificity = scopeSpecificity(b.pageScope) - scopeSpecificity(a.pageScope);
    if (specificity !== 0) return specificity;
    return a.id.localeCompare(b.id);
  })[0];
}

/** Deeper path prefixes are more specific; "every page" is the least. */
function scopeSpecificity(scope: string | null): number {
  if (scope === null) return 0;
  if (scope === "/") return 1;
  return scope.split("/").filter(Boolean).length + 1;
}
