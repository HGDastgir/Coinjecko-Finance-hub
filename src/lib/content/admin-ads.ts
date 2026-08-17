import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Staff reads for the advertising desk.
 *
 * Uses the RLS-bound session client, not the service-role one: the
 * "ads: manage with ads.manage" policy from migration 0002 is what
 * decides whether these rows come back, so a role without the
 * permission gets nothing from the database itself rather than from a
 * check in this file.
 *
 * Unlike the public read this returns paused and expired campaigns —
 * the whole job of this screen is seeing inventory that is not
 * currently running.
 */

export interface AdminAd {
  id: string;
  name: string;
  kind: string;
  placement: string;
  targetUrl: string | null;
  imagePath: string | null;
  imageAlt: string | null;
  label: string;
  locale: string | null;
  pageScope: string | null;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const SELECT =
  "id, name, kind, placement, target_url, image_path, image_alt, label, locale, page_scope, priority, starts_at, ends_at, is_active, created_at";

interface Row {
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
  is_active: boolean;
  created_at: string;
}

function toAdminAd(row: Row): AdminAd {
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
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/**
 * Returns null when the backend is unreachable and [] when there are
 * genuinely no campaigns — the same distinction the rest of the admin
 * surfaces keep, because "not connected" and "nothing booked" call for
 * different actions from the reader.
 */
export async function listAds(): Promise<AdminAd[] | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("advertisements")
      .select(SELECT)
      // Running campaigns first: they are the ones a mistake is
      // currently visible in.
      .order("is_active", { ascending: false })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      logger.warn("ads.admin_list_failed", { reason: error.message });
      return null;
    }

    return ((data ?? []) as Row[]).map(toAdminAd);
  } catch (err) {
    logger.warn("ads.admin_list_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

/** One campaign for the edit form, or null if absent or not visible. */
export async function getEditableAd(id: string): Promise<AdminAd | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("advertisements")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return toAdminAd(data as Row);
  } catch {
    return null;
  }
}
