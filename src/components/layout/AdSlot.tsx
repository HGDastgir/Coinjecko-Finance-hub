import { publicEnv } from "@/lib/env";
import {
  AD_PLACEMENTS,
  type AdFormat,
  type AdPlacement,
} from "@/content/ad-placements";

/**
 * Monetisation slot, AdSense-ready.
 *
 * Renders nothing at all until NEXT_PUBLIC_ADSENSE_CLIENT is set, so
 * no empty grey box ships to readers before ads are actually sold.
 * When it is set, the slot reserves its space up front — a slot that
 * collapses and then expands when the ad arrives shoves the article
 * down under the reader's thumb, which is both a Core Web Vitals
 * penalty (CLS) and, on the phones most of this audience uses, the
 * cause of accidental taps on the ad itself.
 *
 * The "Advertisement" label is deliberate and required: the project's
 * advertising disclosure commits to labelling paid placements, and
 * AdSense policy requires ads be distinguishable from content.
 *
 * `placement` names a position from content/ad-placements.ts, which is
 * also the vocabulary of the `placement` column on
 * `public.advertisements` — the same id books a direct campaign and
 * renders the slot. The format (and therefore the reserved height)
 * comes from the placement, so one position cannot quietly reserve
 * different space on different pages.
 *
 * ENABLING ADSENSE also needs a CSP change in
 * src/lib/security/headers.ts — script-src, img-src and frame-src for
 * googlesyndication/doubleclick — plus the loader script in the
 * layout. Both are deliberately left undone: adding those origins
 * widens the policy materially and should be a considered decision,
 * not a side effect of adding a placeholder.
 */

/** Reserved heights, matched to the standard IAB units. */
const RESERVED: Record<AdFormat, string> = {
  leaderboard: "min-h-[90px]",
  rectangle: "min-h-[250px]",
  "mobile-banner": "min-h-[100px]",
};

export function AdSlot({
  placement,
  label,
}: {
  placement: AdPlacement;
  /** Localised "Advertisement" string. */
  label: string;
}) {
  const client = publicEnv.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;

  return (
    <aside
      aria-label={label}
      className="my-8 flex flex-col items-center gap-1"
      data-ad-placement={placement}
    >
      <span className="text-[0.625rem] font-medium uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      <div
        className={`flex w-full items-center justify-center rounded-lg border border-border bg-surface ${RESERVED[AD_PLACEMENTS[placement]]}`}
      >
        {/* The <ins class="adsbygoogle"> element and its loader land
            here once the CSP entries above are added. */}
      </div>
    </aside>
  );
}
