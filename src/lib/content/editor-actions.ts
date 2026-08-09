"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireUser, AuthorizationError } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { canEdit, checkTransition } from "@/lib/content/workflow";
import { getEditableArticle, getEditableVideo } from "@/lib/content/admin-content";
import { isArticleType } from "@/lib/content/article-types";
import { resolveVideoSource } from "@/lib/content/video-embed";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { writeAuditEvent } from "@/lib/audit";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { logger } from "@/lib/logger";

/**
 * Create/update actions for articles and videos.
 *
 * A Server Action is a public POST endpoint, so every field is
 * re-validated here and every authorisation decision is re-made from
 * the session — the form is treated as attacker-controlled input. The
 * database (RLS + the workflow trigger in migration 0004) remains the
 * enforcement boundary; these checks exist to fail early with a message
 * a human can act on.
 *
 * The form carries an INTENT: "draft" saves, "publish" saves and then
 * makes the piece public in one action. Publishing is still not a free
 * pass — the intent is run through the same checkTransition() table the
 * workflow buttons use, requires content.publish, and the database
 * trigger from migration 0004 enforces the identical rules underneath.
 * The button is a shortcut through the workflow, never around it.
 */

export interface SaveResult {
  ok: boolean;
  message: string;
}

const SLUG = /^[a-z0-9-]+$/;

function readString(form: FormData, key: string, max: number): string {
  const value = form.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function readBoolean(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

function localeFrom(form: FormData): Locale {
  const value = form.get("locale");
  return typeof value === "string" && isLocale(value) ? value : defaultLocale;
}

/**
 * An image reference we are willing to persist: a bucket-relative
 * storage path, or an absolute https URL. Rejecting anything else here
 * means a hostile `javascript:` or `data:` value never reaches the
 * column in the first place — resolveImageSrc() refuses it again at
 * render time, so this is defence in depth rather than the only gate.
 */
function isStorableImageRef(value: string): boolean {
  if (/^https:\/\//i.test(value)) return true;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
  if (value.startsWith("//")) return false;
  return /^[A-Za-z0-9._\-/]+$/.test(value) && !value.includes("..");
}

/** Postgres unique_violation, surfaced as something an editor can fix. */
function describeDbError(message: string): string {
  if (message.includes("duplicate key") || message.includes("23505")) {
    return "That slug is already used by another article in the same language.";
  }
  return "The database refused the change.";
}

interface TranslationInput {
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
}

/**
 * Collect the per-locale fields. A locale is only written when it has
 * both a title and a slug; anything half-filled is an error rather
 * than a silently dropped translation.
 */
function collectTranslations(
  form: FormData,
): { ok: true; rows: TranslationInput[] } | { ok: false; message: string } {
  const rows: TranslationInput[] = [];

  for (const locale of locales) {
    const title = readString(form, `${locale}_title`, 300);
    const slug = readString(form, `${locale}_slug`, 120);
    const excerpt = readString(form, `${locale}_excerpt`, 600);
    const body = readString(form, `${locale}_body`, 60_000);

    const hasAny = title || slug || excerpt || body;
    if (!hasAny) continue;

    if (!title || !slug) {
      return {
        ok: false,
        message: `The ${locale.toUpperCase()} translation needs both a title and a slug.`,
      };
    }
    if (!SLUG.test(slug)) {
      return {
        ok: false,
        message: `The ${locale.toUpperCase()} slug may contain only lowercase letters, numbers and hyphens.`,
      };
    }

    rows.push({
      locale,
      slug,
      title,
      excerpt,
      body,
      seoTitle: readString(form, `${locale}_seo_title`, 200),
      seoDescription: readString(form, `${locale}_seo_description`, 400),
    });
  }

  if (rows.length === 0) {
    return { ok: false, message: "Add at least one language before saving." };
  }
  return { ok: true, rows };
}

export async function saveArticle(
  _prevState: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  const uiLocale = localeFrom(formData);
  const idInput = formData.get("articleId");
  const articleId = typeof idInput === "string" && idInput ? idInput : null;

  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { ok: false, message: "Sign-in required." };
    }
    throw err;
  }

  const articleType = formData.get("articleType");
  if (!isArticleType(articleType)) {
    return { ok: false, message: "Unknown article type." };
  }

  const isSponsored = readBoolean(formData, "isSponsored");
  const sponsorName = readString(formData, "sponsorName", 200);

  // A storage path, or an absolute https URL for artwork hosted
  // elsewhere. Anything else is refused rather than stored and then
  // silently dropped by resolveImageSrc() at render time.
  const heroImagePath = readString(formData, "heroImagePath", 500);
  if (heroImagePath && !isStorableImageRef(heroImagePath)) {
    return {
      ok: false,
      message:
        "The hero image must be an uploaded path or an https:// URL.",
    };
  }
  // Mirrors the sponsored_needs_sponsor check constraint in 0002.
  if (isSponsored && !sponsorName) {
    return {
      ok: false,
      message: "Sponsored content must name its sponsor.",
    };
  }

  const collected = collectTranslations(formData);
  if (!collected.ok) return { ok: false, message: collected.message };

  // Which submit button was pressed. Anything other than an explicit
  // publish is treated as a draft save — the safe default.
  const wantsPublish = formData.get("intent") === "publish";
  if (wantsPublish && !hasPermission(user.role, "content.publish")) {
    return { ok: false, message: "Your role cannot publish." };
  }

  const supabase = await createSupabaseServerClient();
  let targetId = articleId;
  let published = false;

  if (articleId) {
    const existing = await getEditableArticle(articleId);
    if (!existing) {
      return { ok: false, message: "Article not found, or not visible to you." };
    }
    if (!canEdit(user.role, existing.createdBy === user.id)) {
      logger.warn("content.edit_denied", {
        userId: user.id,
        articleId,
        role: user.role,
      });
      return { ok: false, message: "You have no edit rights on this article." };
    }

    // Already-published pieces stay published across an edit; the
    // transition table has no published → published move, so asking
    // for one would be refused.
    const shouldTransition = wantsPublish && existing.status !== "published";
    if (shouldTransition) {
      const verdict = checkTransition(
        user.role,
        existing.status,
        "published",
        existing.createdBy === user.id,
      );
      if (!verdict.allowed) {
        return { ok: false, message: verdict.reason };
      }
    }

    const { error } = await supabase
      .from("articles")
      .update({
        article_type: articleType,
        is_sponsored: isSponsored,
        sponsor_name: isSponsored ? sponsorName : null,
        hero_image_path: heroImagePath || null,
        // published_at is filled by the 0004 trigger, never by us.
        ...(shouldTransition ? { status: "published" } : {}),
      })
      .eq("id", articleId);

    if (error) {
      logger.error("content.update_failed", {
        articleId,
        dbError: error.message,
      });
      return { ok: false, message: describeDbError(error.message) };
    }
    published = wantsPublish || existing.status === "published";
  } else {
    if (!hasPermission(user.role, "content.create")) {
      return { ok: false, message: "Your role cannot create articles." };
    }

    // Inserts skip the workflow trigger, so the 0004 insert policy is
    // what gates a born-public row — it requires content.publish, the
    // same permission checked above. published_at must be set here
    // because the check constraint sees no trigger on INSERT.
    const { data, error } = await supabase
      .from("articles")
      .insert({
        article_type: articleType,
        status: wantsPublish ? "published" : "draft",
        published_at: wantsPublish ? new Date().toISOString() : null,
        hero_image_path: heroImagePath || null,
        created_by: user.id,
        is_sponsored: isSponsored,
        sponsor_name: isSponsored ? sponsorName : null,
      })
      .select("id")
      .single();

    if (error || !data) {
      logger.error("content.create_failed", { dbError: error?.message });
      return {
        ok: false,
        message: error ? describeDbError(error.message) : "Could not create the article.",
      };
    }
    targetId = (data as { id: string }).id;
    published = wantsPublish;
  }

  if (!targetId) return { ok: false, message: "Could not resolve the article." };
  const savedId: string = targetId;

  const { error: translationError } = await supabase
    .from("article_translations")
    .upsert(
      collected.rows.map((row) => ({
        article_id: savedId,
        locale: row.locale,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt || null,
        body: row.body,
        seo_title: row.seoTitle || null,
        seo_description: row.seoDescription || null,
      })),
      { onConflict: "article_id,locale" },
    );

  if (translationError) {
    logger.error("content.translation_save_failed", {
      articleId: savedId,
      dbError: translationError.message,
    });
    return { ok: false, message: describeDbError(translationError.message) };
  }

  const requestHeaders = await headers();
  await writeAuditEvent({
    actorId: user.id,
    action: wantsPublish
      ? "content.published"
      : articleId
        ? "content.updated"
        : "content.created",
    entity: "articles",
    entityId: savedId,
    metadata: {
      articleType,
      published,
      locales: collected.rows.map((r) => r.locale),
    },
    ip: requestHeaders.get("x-forwarded-for") ?? undefined,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  });

  revalidatePath(`/${uiLocale}/admin`);
  for (const locale of locales) {
    revalidatePath(`/${locale}/blog`);
    const row = collected.rows.find((r) => r.locale === locale);
    if (row) revalidatePath(`/${locale}/blog/${row.slug}`);
  }

  // A newly created article has no edit URL until now, so send the
  // author to it rather than leaving them on an empty create form.
  if (!articleId) {
    redirect(`/${uiLocale}/admin/articles/${savedId}`);
  }

  return {
    ok: true,
    message: published
      ? "Saved and published — live on the blog within two minutes."
      : "Saved as a draft.",
  };
}

// ------------------------------------------------------------
// Videos
// ------------------------------------------------------------

const VIDEO_PROVIDERS = ["youtube", "self_hosted"] as const;

export async function saveVideo(
  _prevState: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  const uiLocale = localeFrom(formData);
  const idInput = formData.get("videoId");
  const videoId = typeof idInput === "string" && idInput ? idInput : null;

  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { ok: false, message: "Sign-in required." };
    }
    throw err;
  }

  if (!hasPermission(user.role, "media.manage_video")) {
    return { ok: false, message: "Your role cannot manage videos." };
  }

  const title = readString(formData, "title", 300);
  const slug = readString(formData, "slug", 120);
  const description = readString(formData, "description", 2000);
  const providerInput = readString(formData, "provider", 40);
  const providerRef = readString(formData, "providerRef", 300);
  const durationInput = readString(formData, "durationSeconds", 12);
  const isShort = readBoolean(formData, "isShort");
  const publish = readBoolean(formData, "publish");

  const contentLocaleInput = formData.get("contentLocale");
  const contentLocale: Locale =
    typeof contentLocaleInput === "string" && isLocale(contentLocaleInput)
      ? contentLocaleInput
      : "en";

  if (!title) return { ok: false, message: "A video needs a title." };
  if (!SLUG.test(slug)) {
    return {
      ok: false,
      message: "The slug may contain only lowercase letters, numbers and hyphens.",
    };
  }

  const provider = (VIDEO_PROVIDERS as readonly string[]).includes(providerInput)
    ? providerInput
    : "";
  if (providerInput && !provider) {
    return { ok: false, message: "Unknown video provider." };
  }
  // The public page refuses to render a reference it cannot validate,
  // so reject it at the point of entry instead of saving something
  // that will silently never play.
  if (provider && !resolveVideoSource(provider, providerRef)) {
    return {
      ok: false,
      message:
        provider === "youtube"
          ? "That does not look like a YouTube video id (letters, numbers, - and _ only)."
          : "A self-hosted reference must be a path on this site, e.g. /media/episode-1.mp4.",
    };
  }

  let durationSeconds: number | null = null;
  if (durationInput) {
    const parsed = Number(durationInput);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return { ok: false, message: "Duration must be a whole number of seconds." };
    }
    durationSeconds = parsed;
  }

  const supabase = await createSupabaseServerClient();

  const row = {
    title,
    slug,
    locale: contentLocale,
    description: description || null,
    provider: provider || null,
    provider_ref: providerRef || null,
    is_short: isShort,
    duration_s: durationSeconds,
    status: publish ? "published" : "draft",
    // videos have no workflow trigger, so the timestamp is set here.
    published_at: publish ? new Date().toISOString() : null,
  };

  let targetId = videoId;

  if (videoId) {
    const existing = await getEditableVideo(videoId);
    if (!existing) {
      return { ok: false, message: "Video not found, or not visible to you." };
    }
    // 0002's WITH CHECK ties writes to the row's creator; say so plainly
    // rather than letting the database return an opaque failure.
    if (existing.createdBy !== user.id) {
      return {
        ok: false,
        message: "Only the person who added this video can edit it.",
      };
    }

    const { error } = await supabase
      .from("videos")
      .update({
        ...row,
        published_at: publish
          ? (existing.publishedAt ?? row.published_at)
          : null,
      })
      .eq("id", videoId);

    if (error) {
      logger.error("media.update_failed", { videoId, dbError: error.message });
      return { ok: false, message: describeDbError(error.message) };
    }
  } else {
    const { data, error } = await supabase
      .from("videos")
      .insert({ ...row, created_by: user.id })
      .select("id")
      .single();

    if (error || !data) {
      logger.error("media.create_failed", { dbError: error?.message });
      return {
        ok: false,
        message: error ? describeDbError(error.message) : "Could not create the video.",
      };
    }
    targetId = (data as { id: string }).id;
  }

  const requestHeaders = await headers();
  await writeAuditEvent({
    actorId: user.id,
    action: publish
      ? "content.published"
      : videoId
        ? "content.updated"
        : "content.created",
    entity: "videos",
    entityId: targetId ?? undefined,
    metadata: { slug, locale: contentLocale, provider: provider || null },
    ip: requestHeaders.get("x-forwarded-for") ?? undefined,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  });

  revalidatePath(`/${uiLocale}/admin/videos`);
  revalidatePath(`/${contentLocale}/vlogs`);
  revalidatePath(`/${contentLocale}/vlogs/${slug}`);

  if (!videoId) {
    redirect(`/${uiLocale}/admin/videos`);
  }

  return { ok: true, message: publish ? "Saved and published." : "Saved as draft." };
}
