import { publicEnv } from "@/lib/env";
import { AdUnit } from "@/components/layout/AdUnit";
import { DirectAd } from "@/components/layout/DirectAd";
import { fetchLiveAds } from "@/lib/content/ads";
import { selectAd } from "@/content/ad-targeting";
import {
  AD_PLACEMENTS,
  type AdFormat,
  type AdPlacement,
} from "@/content/ad-placements";
import type { Locale } from "@/i18n/config";

/**
 * Monetisation slot.
 *
 * The slot reserves its space up front whenever it will render
 * anything — a slot that collapses and then expands when the ad
 * arrives shoves the article down under the reader's thumb, which is
 * both a Core Web Vitals penalty (CLS) and, on the phones most of this
 * audience uses, the cause of accidental taps on the ad itself.
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
 * FOUR STATES, in the order they are tried:
 *
 * 1. A live direct campaign targeting this placement, locale and page
 *    — rendered from the database. Sold inventory outranks the
 *    network, which is the whole economics of selling it.
 * 2. No campaign, NEXT_PUBLIC_ADSENSE_CLIENT and _SLOT set — a real
 *    AdSense unit.
 * 3. Client but no slot id — labelled, correctly sized reserved space
 *    with no creative. This is the state for seeing and selling
 *    inventory before ads go live.
 * 4. Neither — renders nothing at all, so no empty grey box ships to
 *    readers before anything is sold, and no Google request is made.
 *
 * The CSP widens for Google's ad network in step with state 4 → 2/3;
 * see the ADSENSE block in src/lib/security/headers.ts. Direct
 * campaigns need no widening: the creative is served from our own
 * storage host, which img-src already allows.
 */

/** Reserved heights, matched to the standard IAB units. */
const RESERVED: Record<AdFormat, string> = {
  leaderboard: "min-h-[90px]",
  rectangle: "min-h-[250px]",
  "mobile-banner": "min-h-[100px]",
};

export async function AdSlot({
  placement,
  label,
  locale,
  path,
}: {
  placement: AdPlacement;
  /** Localised "Advertisement" string. */
  label: string;
  /**
   * Locale and page this slot is rendering on, used to resolve which
   * booked campaign belongs here. Both optional so a caller that has
   * not been updated still renders network ads exactly as before —
   * but a slot without them can only ever match a run-of-site
   * campaign, so pass them.
   */
  locale?: Locale;
  /** Locale-less path, e.g. "/blog" or "/markets/kse-100". */
  path?: string;
}) {
  const ads = locale && path ? await fetchLiveAds() : [];
  const booked = locale && path ? selectAd(ads, { placement, locale, path }) : null;

  const client = publicEnv.NEXT_PUBLIC_ADSENSE_CLIENT;
  // Nothing sold and no network configured: render nothing rather than
  // an empty bordered box that reads as a broken page.
  if (!booked && !client) return null;

  const slotId = publicEnv.NEXT_PUBLIC_ADSENSE_SLOT;

  return (
    <aside
      aria-label={booked ? booked.label : label}
      className="my-8 flex flex-col items-center gap-1"
      data-ad-placement={placement}
    >
      <span className="text-[0.625rem] font-medium uppercase tracking-widest text-ink-muted">
        {booked ? booked.label : label}
      </span>
      <div
        className={`flex w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-surface ${RESERVED[AD_PLACEMENTS[placement]]}`}
      >
        {booked ? (
          <DirectAd ad={booked} />
        ) : slotId && client ? (
          <AdUnit client={client} slotId={slotId} />
        ) : (
          <span className="text-xs text-ink-muted">{placement}</span>
        )}
      </div>
    </aside>
  );
}
