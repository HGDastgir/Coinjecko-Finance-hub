/**
 * The canonical list of advertising positions on the site.
 *
 * This is the vocabulary for the `placement` column on
 * `public.advertisements` (migration 0002). Booking a direct campaign
 * means naming one of these ids, so they are a fixed set rather than
 * free text invented per page — a typo'd placement would otherwise be
 * a campaign that silently never renders.
 *
 * Each placement declares the IAB-style unit it reserves space for, so
 * the slot can hold its height before an ad loads. See AdSlot for why
 * that matters (CLS, and mis-taps on phones).
 */

export type AdFormat = "leaderboard" | "rectangle" | "mobile-banner";

export const AD_PLACEMENTS = {
  /** Directly under the header, above the page's first heading. */
  "top-leaderboard": "leaderboard",
  /** Between items in a list — the blog feed. */
  "in-feed": "rectangle",
  /** Inside an article body, after the opening paragraphs. */
  "in-article": "rectangle",
  /** After the article ends, before the sources block. */
  "article-end": "leaderboard",
  /** Under a vlog player. */
  "below-player": "leaderboard",
  /** At the foot of a section landing page. */
  "section-footer": "leaderboard",
} as const satisfies Record<string, AdFormat>;

export type AdPlacement = keyof typeof AD_PLACEMENTS;

export function isAdPlacement(value: unknown): value is AdPlacement {
  return typeof value === "string" && value in AD_PLACEMENTS;
}

/**
 * The `kind` column's vocabulary, mirrored from the check constraint in
 * migration 0002.
 *
 * `adsense` means "leave this slot to the network" and is the only kind
 * that renders no creative of ours; every other kind is inventory sold
 * directly and must carry a destination. The labels are what the
 * booking form shows.
 */
export const AD_KINDS = {
  direct: "Direct display campaign",
  affiliate: "Affiliate placement",
  sponsored_article: "Sponsored article promo",
  newsletter_sponsor: "Newsletter sponsor",
  podcast_sponsor: "Podcast sponsor",
  adsense: "AdSense (network fills the slot)",
} as const;

export type AdKind = keyof typeof AD_KINDS;

export function isAdKind(value: unknown): value is AdKind {
  return typeof value === "string" && value in AD_KINDS;
}
