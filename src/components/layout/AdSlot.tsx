import { publicEnv } from "@/lib/env";
import { AdUnit } from "@/components/layout/AdUnit";
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
 * THREE STATES, driven by configuration:
 *
 * 1. No NEXT_PUBLIC_ADSENSE_CLIENT — renders nothing. A site with no
 *    ads makes no Google request and keeps the tighter CSP.
 * 2. Client but no NEXT_PUBLIC_ADSENSE_SLOT — renders labelled,
 *    correctly sized reserved space with no creative. This is the
 *    state for seeing and selling inventory before ads go live.
 * 3. Client and slot — renders a real AdSense unit.
 *
 * The CSP widens for Google's ad network in step with state 1 → 2/3;
 * see the ADSENSE block in src/lib/security/headers.ts.
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
  const slotId = publicEnv.NEXT_PUBLIC_ADSENSE_SLOT;

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
        {slotId ? (
          <AdUnit client={client} slotId={slotId} />
        ) : (
          <span className="text-xs text-ink-muted">{placement}</span>
        )}
      </div>
    </aside>
  );
}
