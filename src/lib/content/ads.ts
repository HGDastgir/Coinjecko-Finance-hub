import "server-only";
import { cache } from "react";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { logger } from "@/lib/logger";
import { isAdPlacement, type AdPlacement } from "@/content/ad-placements";
import type { TargetableAd } from "@/content/ad-targeting";

/**
 * Live advertising campaigns, for the public renderer.
 *
 * Read through the cookie-free anon client so the pages carrying ad
 * slots stay prerenderable — the whole point of ISR here is that a
 * campaign is baked into the cached HTML and costs nothing per
 * visitor. Publishing or pausing a campaign purges every page (see
 * revalidateEveryPage), which is the correct blast radius for
 * something that renders site-wide.
 *
 * RLS limits anon to `is_active` rows, so a paused campaign is not
 * merely hidden by this query — the database will not return it.
 * The flight window is applied on top, in code, because it depends on
 * "now" and would otherwise defeat caching at the SQL level.
 */

export interface LiveAd extends TargetableAd {
  id: string;
  name: string;
  kind: string;
  placement: AdPlacement;
  targetUrl: string | null;
  imagePath: string | null;
  imageAlt: string | null;
  label: string;
}

const SELECT =
  "id, name, kind, placement, target_url, image_path, image_alt, label, locale, page_scope, priority, starts_at, ends_at";

interface AdRow {
  id: string;
  name: string;
  kind: string;
  placement: string;
  target_url: string | null;
  image_path: string | null;
  image_alt: string | null;
  label: string | null;
  locale: string | null;
  page_scope: string | null;
  priority: number | null;
  starts_at: string | null;
  ends_at: string | null;
}

function toLiveAd(row: AdRow): LiveAd | null {
  // A placement the code does not know about cannot be rendered — it
  // has no reserved height and no slot calls for it. Dropping the row
  // is right, but it is a booking somebody made and paid for, so it is
  // logged rather than discarded quietly.
  if (!isAdPlacement(row.placement)) {
    logger.warn("ads.unknown_placement", {
      adId: row.id,
      placement: row.placement,
    });
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    placement: row.placement,
    targetUrl: row.target_url,
    imagePath: row.image_path,
    imageAlt: row.image_alt,
    label: row.label?.trim() || "Advertisement",
    locale: row.locale,
    pageScope: row.page_scope,
    priority: row.priority ?? 0,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  };
}

/**
 * Every live campaign, once per request.
 *
 * React's cache() dedupes across the several AdSlots a single page
 * renders — a homepage with a leaderboard and an in-feed slot asks the
 * database once, not twice. The whole table of live campaigns is small
 * by nature (it is inventory, not content), so fetching all of it and
 * filtering in code beats one query per slot.
 *
 * Returns [] on failure, not null: an advertising outage must never
 * take a page down, and "no ads" is the safe, correct rendering.
 */
export const fetchLiveAds = cache(async (): Promise<LiveAd[]> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("advertisements")
      .select(SELECT)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(100);

    if (error) {
      logger.warn("ads.list_failed", { reason: error.message });
      return [];
    }

    return ((data ?? []) as AdRow[])
      .map(toLiveAd)
      .filter((ad): ad is LiveAd => ad !== null);
  } catch (err) {
    logger.warn("ads.list_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return [];
  }
});
