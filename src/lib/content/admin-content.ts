import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isContentStatus, type ContentStatus } from "@/lib/content/workflow";
import { isArticleType, type ArticleType } from "@/lib/content/article-types";
import type { Locale } from "@/i18n/config";

/**
 * Editor-side reads for the admin CMS.
 *
 * Like articles.ts these use the RLS-bound request client, so what
 * comes back is whatever the caller's own role is allowed to see —
 * the UI never widens access, it only hides what the database would
 * refuse anyway. `null` means "backend unreachable", which the admin
 * surfaces report as such instead of showing an empty form.
 */

export interface EditableTranslation {
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
}

export interface EditableArticle {
  id: string;
  status: ContentStatus;
  articleType: ArticleType;
  isSponsored: boolean;
  sponsorName: string;
  heroImagePath: string;
  createdBy: string;
  translations: Record<Locale, EditableTranslation | null>;
}

interface TranslationRow {
  locale: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

interface ArticleRow {
  id: string;
  status: string;
  article_type: string;
  is_sponsored: boolean;
  sponsor_name: string | null;
  hero_image_path: string | null;
  created_by: string;
  article_translations: TranslationRow[] | null;
}

const EDIT_SELECT =
  "id,status,article_type,is_sponsored,sponsor_name,hero_image_path,created_by," +
  "article_translations(locale,slug,title,excerpt,body,seo_title,seo_description)";

function toEditable(row: TranslationRow, locale: Locale): EditableTranslation {
  return {
    locale,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    body: row.body ?? "",
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
  };
}

export async function getEditableArticle(
  articleId: string,
): Promise<EditableArticle | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("articles")
      .select(EDIT_SELECT)
      .eq("id", articleId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        logger.warn("content.edit_read_failed", { dbError: error.message });
      }
      return null;
    }

    const row = data as unknown as ArticleRow;
    if (!isContentStatus(row.status) || !isArticleType(row.article_type)) {
      return null;
    }

    const rows = row.article_translations ?? [];
    const english = rows.find((t) => t.locale === "en");
    const urdu = rows.find((t) => t.locale === "ur");

    return {
      id: row.id,
      status: row.status,
      articleType: row.article_type,
      isSponsored: row.is_sponsored,
      sponsorName: row.sponsor_name ?? "",
      heroImagePath: row.hero_image_path ?? "",
      createdBy: row.created_by,
      translations: {
        en: english ? toEditable(english, "en") : null,
        ur: urdu ? toEditable(urdu, "ur") : null,
      },
    };
  } catch (err) {
    logger.warn("content.edit_read_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

// ------------------------------------------------------------
// Videos
// ------------------------------------------------------------

export interface EditableVideo {
  id: string;
  status: ContentStatus;
  locale: Locale;
  title: string;
  slug: string;
  description: string;
  provider: string;
  providerRef: string;
  isShort: boolean;
  durationSeconds: number | null;
  createdBy: string;
  publishedAt: string | null;
  updatedAt: string | null;
}

interface VideoRow {
  id: string;
  status: string;
  locale: string;
  title: string;
  slug: string;
  description: string | null;
  provider: string | null;
  provider_ref: string | null;
  is_short: boolean;
  duration_s: number | null;
  created_by: string;
  published_at: string | null;
  updated_at: string | null;
}

const VIDEO_SELECT =
  "id,status,locale,title,slug,description,provider,provider_ref," +
  "is_short,duration_s,created_by,published_at,updated_at";

function toEditableVideo(row: VideoRow): EditableVideo | null {
  if (!isContentStatus(row.status)) return null;
  return {
    id: row.id,
    status: row.status,
    locale: row.locale === "ur" ? "ur" : "en",
    title: row.title,
    slug: row.slug,
    description: row.description ?? "",
    provider: row.provider ?? "",
    providerRef: row.provider_ref ?? "",
    isShort: row.is_short,
    durationSeconds: row.duration_s,
    createdBy: row.created_by,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export async function listVideos(
  limit = 100,
): Promise<EditableVideo[] | null> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv;
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("videos")
      .select(VIDEO_SELECT)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn("media.list_failed", { dbError: error.message });
      return null;
    }
    return ((data ?? []) as unknown as VideoRow[])
      .map(toEditableVideo)
      .filter((v): v is EditableVideo => v !== null);
  } catch (err) {
    logger.warn("media.list_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

export async function getEditableVideo(
  videoId: string,
): Promise<EditableVideo | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("videos")
      .select(VIDEO_SELECT)
      .eq("id", videoId)
      .maybeSingle();

    if (error || !data) return null;
    return toEditableVideo(data as unknown as VideoRow);
  } catch {
    return null;
  }
}
