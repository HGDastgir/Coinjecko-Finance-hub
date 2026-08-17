"use server";

import { headers } from "next/headers";
import { requireUser, AuthorizationError } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { writeAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { isLocale } from "@/i18n/config";
import { isAdKind, isAdPlacement } from "@/content/ad-placements";
import { isAdScope } from "@/content/ad-targeting";
import { revalidateEveryPage } from "@/lib/content/revalidate";
import { getEditableAd } from "@/lib/content/admin-ads";

/**
 * Booking, editing and pausing advertising campaigns.
 *
 * Authorisation is the database's job: the "ads: manage with
 * ads.manage" policy from migration 0002 gates every statement here,
 * and the permission check in each action is the second lock, not the
 * only one. The validation below is a third layer whose purpose is a
 * message an advertising manager can act on — the CHECK constraints in
 * migration 0011 are what actually guarantee the row is renderable.
 *
 * Every mutation purges every cached page. A campaign booked for
 * "every page" is baked into the ISR HTML of the whole site, so
 * anything narrower would leave a paused ad running for up to five
 * minutes on pages nobody thought to purge — and for a campaign pulled
 * because the advertiser asked, that is a real problem, not a cosmetic
 * one.
 */

export interface AdSaveResult {
  ok: boolean;
  message: string;
  /** Set on a successful create so the page can route to the edit form. */
  id?: string;
}

const MAX_NAME = 120;
const MAX_LABEL = 60;
const MAX_ALT = 200;
const MAX_URL = 2000;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * A datetime-local input gives "2026-08-17T14:30" with no zone. Read as
 * UTC deliberately, and the form says so: a flight window that silently
 * means "whatever zone the booker's laptop was in" is unauditable when
 * two people book the same slot from different countries.
 */
function toTimestamp(value: string): string | null | undefined {
  if (!value) return null;
  const parsed = new Date(`${value}Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

interface ValidatedAd {
  name: string;
  kind: string;
  placement: string;
  target_url: string | null;
  image_path: string | null;
  image_alt: string | null;
  label: string;
  locale: string | null;
  page_scope: string | null;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

function validate(formData: FormData): ValidatedAd | string {
  const name = text(formData, "name");
  if (!name) return "Give the campaign a name so it can be found later.";
  if (name.length > MAX_NAME) return `Keep the name under ${MAX_NAME} characters.`;

  const kind = text(formData, "kind");
  if (!isAdKind(kind)) return "Choose a campaign type.";

  const placement = text(formData, "placement");
  if (!isAdPlacement(placement)) return "Choose a placement.";

  const targetRaw = text(formData, "targetUrl");
  let targetUrl: string | null = null;
  if (targetRaw) {
    if (targetRaw.length > MAX_URL) return "That destination URL is too long.";
    // https only, and parsed rather than pattern-matched so a value
    // like "https:/evil" or one carrying credentials is rejected here
    // rather than becoming an href.
    let parsed: URL;
    try {
      parsed = new URL(targetRaw);
    } catch {
      return "The destination must be a full URL, starting with https://";
    }
    if (parsed.protocol !== "https:") {
      return "The destination must use https:// — other schemes are refused.";
    }
    targetUrl = parsed.toString();
  }
  if (kind !== "adsense" && !targetUrl) {
    return "A direct campaign needs a destination URL, or the ad has nowhere to click.";
  }

  const imageRaw = text(formData, "imagePath");
  let imagePath: string | null = null;
  if (imageRaw) {
    // Storage object keys only. An absolute URL to somebody else's
    // host would be blocked by our img-src CSP and render as a broken
    // slot, so it is refused here with an explanation instead.
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(imageRaw)) {
      return "The creative must be uploaded here — an external image URL cannot be used.";
    }
    if (imageRaw.includes("..")) return "That storage path is not valid.";
    imagePath = imageRaw;
  }

  const imageAlt = text(formData, "imageAlt").slice(0, MAX_ALT);
  if (imagePath && !imageAlt) {
    return "Describe the creative in the alt text — an unlabelled ad is unreadable to screen readers.";
  }

  const label = text(formData, "label").slice(0, MAX_LABEL) || "Advertisement";

  const localeRaw = text(formData, "adLocale");
  if (localeRaw && !isLocale(localeRaw)) return "That is not a locale we publish.";
  const locale = localeRaw || null;

  const scopeRaw = text(formData, "pageScope");
  if (scopeRaw && !isAdScope(scopeRaw)) {
    return "That page scope is not one of the sections carrying ad slots.";
  }
  const pageScope = scopeRaw || null;

  const priority = Number(text(formData, "priority") || "0");
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) {
    return "Priority must be a whole number from 0 to 100.";
  }

  const startsAt = toTimestamp(text(formData, "startsAt"));
  const endsAt = toTimestamp(text(formData, "endsAt"));
  if (startsAt === undefined || endsAt === undefined) {
    return "One of the flight dates could not be read.";
  }
  if (startsAt && endsAt && endsAt <= startsAt) {
    return "The end of the flight must come after its start.";
  }

  return {
    name,
    kind,
    placement,
    target_url: targetUrl,
    image_path: imagePath,
    image_alt: imagePath ? imageAlt : null,
    label,
    locale,
    page_scope: pageScope,
    priority,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: formData.get("isActive") === "on",
  };
}

async function authorise(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { ok: false, message: "Sign-in required." };
    }
    throw err;
  }

  if (!hasPermission(user.role, "ads.manage")) {
    logger.warn("ads.write_denied", { userId: user.id, role: user.role });
    return {
      ok: false,
      message: "Your role does not hold ads.manage, so campaigns are read-only.",
    };
  }

  return { ok: true, userId: user.id };
}

async function audit(
  userId: string,
  adId: string,
  what: Record<string, unknown>,
): Promise<void> {
  const requestHeaders = await headers();
  await writeAuditEvent({
    actorId: userId,
    action: "advertisement.changed",
    entity: "advertisements",
    entityId: adId,
    metadata: what,
    ip: requestHeaders.get("x-forwarded-for") ?? undefined,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  });
}

/**
 * Create or update a campaign. One action for both because the form is
 * the same form; the presence of an id decides which statement runs.
 */
export async function saveAd(
  _prev: AdSaveResult | null,
  formData: FormData,
): Promise<AdSaveResult> {
  const auth = await authorise();
  if (!auth.ok) return { ok: false, message: auth.message };

  const validated = validate(formData);
  if (typeof validated === "string") {
    return { ok: false, message: validated };
  }

  const adId = text(formData, "adId");
  const supabase = await createSupabaseServerClient();

  if (adId) {
    if (!/^[0-9a-f-]{36}$/i.test(adId)) {
      return { ok: false, message: "Missing campaign reference." };
    }

    const { error } = await supabase
      .from("advertisements")
      .update(validated)
      .eq("id", adId);

    if (error) {
      logger.error("ads.update_failed", { adId, dbError: error.message });
      return { ok: false, message: describeDbError(error.message) };
    }

    await audit(auth.userId, adId, {
      change: "updated",
      placement: validated.placement,
      pageScope: validated.page_scope,
      isActive: validated.is_active,
    });
    revalidateEveryPage();
    return { ok: true, message: "Campaign saved.", id: adId };
  }

  const { data, error } = await supabase
    .from("advertisements")
    // created_by is required by the RLS WITH CHECK clause, which
    // insists it equals auth.uid(). Set from the session, never from
    // the form.
    .insert({ ...validated, created_by: auth.userId })
    .select("id")
    .single();

  if (error || !data) {
    logger.error("ads.create_failed", { dbError: error?.message });
    return { ok: false, message: describeDbError(error?.message ?? "") };
  }

  await audit(auth.userId, data.id, {
    change: "created",
    placement: validated.placement,
    pageScope: validated.page_scope,
    isActive: validated.is_active,
  });
  revalidateEveryPage();
  return { ok: true, message: "Campaign created.", id: data.id };
}

export interface AdToggleResult {
  ok: boolean;
  message: string;
}

/**
 * Start or pause a campaign without opening the form.
 *
 * Pausing is the action somebody reaches for under time pressure — an
 * advertiser has asked to be pulled, or the wrong creative went live —
 * so it is one click from the list, and it takes effect everywhere
 * because the revalidation is site-wide.
 */
export async function setAdActive(
  _prev: AdToggleResult | null,
  formData: FormData,
): Promise<AdToggleResult> {
  const auth = await authorise();
  if (!auth.ok) return { ok: false, message: auth.message };

  const adId = text(formData, "adId");
  if (!/^[0-9a-f-]{36}$/i.test(adId)) {
    return { ok: false, message: "Missing campaign reference." };
  }
  const active = text(formData, "active") === "true";

  const existing = await getEditableAd(adId);
  if (!existing) {
    return { ok: false, message: "Campaign not found, or not visible to you." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("advertisements")
    .update({ is_active: active })
    .eq("id", adId);

  if (error) {
    logger.error("ads.toggle_failed", { adId, dbError: error.message });
    return { ok: false, message: describeDbError(error.message) };
  }

  await audit(auth.userId, adId, {
    change: active ? "activated" : "paused",
    name: existing.name,
    placement: existing.placement,
  });
  revalidateEveryPage();

  return {
    ok: true,
    message: active ? "Campaign is live." : "Campaign paused everywhere.",
  };
}

/** Remove a campaign outright. The audit row survives it. */
export async function deleteAd(
  _prev: AdToggleResult | null,
  formData: FormData,
): Promise<AdToggleResult> {
  const auth = await authorise();
  if (!auth.ok) return { ok: false, message: auth.message };

  const adId = text(formData, "adId");
  if (!/^[0-9a-f-]{36}$/i.test(adId)) {
    return { ok: false, message: "Missing campaign reference." };
  }

  const existing = await getEditableAd(adId);
  if (!existing) {
    return { ok: false, message: "Campaign not found, or not visible to you." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("advertisements")
    .delete()
    .eq("id", adId);

  if (error) {
    logger.error("ads.delete_failed", { adId, dbError: error.message });
    return { ok: false, message: describeDbError(error.message) };
  }

  await audit(auth.userId, adId, { change: "deleted", name: existing.name });
  revalidateEveryPage();
  return { ok: true, message: `Deleted “${existing.name}”.` };
}

/**
 * Turn a Postgres error into something a non-engineer can act on.
 *
 * The CHECK constraints from 0011 are the ones a booker can actually
 * trip, and "new row violates check constraint
 * advertisements_direct_needs_target" tells them nothing.
 */
function describeDbError(message: string): string {
  if (/row-level security|policy/i.test(message)) {
    return "The database refused the change — your role does not hold ads.manage.";
  }
  if (/advertisements_direct_needs_target/.test(message)) {
    return "A direct campaign needs a destination URL.";
  }
  if (/advertisements_target_url_https/.test(message)) {
    return "The destination URL must start with https://";
  }
  if (/advertisements_image_needs_alt/.test(message)) {
    return "An image creative needs alt text.";
  }
  if (/advertisements_placement_check/.test(message)) {
    return "That placement is not one the site renders.";
  }
  if (/advertisements_page_scope_check/.test(message)) {
    return "That page scope is not valid.";
  }
  if (/advertisements_window_ordered/.test(message)) {
    return "The end of the flight must come after its start.";
  }
  if (/column .* does not exist/i.test(message)) {
    return "The advertising schema is missing — apply supabase/migrations/0011.";
  }
  return "The database refused the change.";
}
