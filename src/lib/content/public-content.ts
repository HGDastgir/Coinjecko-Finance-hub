import "server-only";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { logger } from "@/lib/logger";
import { isArticleType, type ArticleType } from "@/lib/content/article-types";
import type { Locale } from "@/i18n/config";

/**
 * Public reads for the blog, vlog and breaking-news surfaces.
 *
 * Every function returns `null` when the content backend is absent or
 * refuses the query, and `[]` only when the backend genuinely holds
 * nothing published. The UI distinguishes the two: "not connected" and
 * "nothing published yet" are different statements and we do not blur
 * them into an empty page.
 *
 * Reads go through the cookie-free anon client, so these pages stay
 * prerenderable and RLS pins the result set to published rows.
 */

export interface BreakingItem {
  id: string;
  title: string;
  slug: string;
  publishedAt: string | null;
}

export interface ArticleSummary {
  id: string;
  type: ArticleType;
  isSponsored: boolean;
  sponsorName: string | null;
  publishedAt: string | null;
  heroImagePath: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  authorName: string | null;
}

export interface ArticleSource {
  name: string;
  url: string;
}

export interface ArticleCorrection {
  date: string;
  note: string;
}

export interface FullArticle extends ArticleSummary {
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  sources: ArticleSource[];
  corrections: ArticleCorrection[];
  isMachineTranslated: boolean;
  reviewedTranslation: boolean;
  updatedAt: string | null;
}

interface TranslationRow {
  locale: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body?: string;
  seo_title?: string | null;
  seo_description?: string | null;
  sources?: unknown;
  correction_notes?: unknown;
  is_machine_translated?: boolean;
  reviewed_translation?: boolean;
}

interface ArticleRow {
  id: string;
  article_type: string;
  is_sponsored: boolean;
  sponsor_name: string | null;
  published_at: string | null;
  hero_image_path: string | null;
  updated_at?: string | null;
  authors: { name: string } | { name: string }[] | null;
  article_translations: TranslationRow[] | null;
}

const LIST_SELECT =
  "id,article_type,is_sponsored,sponsor_name,published_at,hero_image_path," +
  "authors(name)," +
  "article_translations!inner(locale,slug,title,excerpt)";

/**
 * Topic filtering rides the tag join. `!inner` on both hops turns the
 * embed into a filter: only articles carrying a tag with that slug come
 * back. A topic with no matching tag row simply yields nothing, which
 * is the truthful answer rather than an error page.
 */
const TAG_JOIN = ",article_tags!inner(tags!inner(slug))";

const DETAIL_SELECT =
  "id,article_type,is_sponsored,sponsor_name,published_at,hero_image_path,updated_at," +
  "authors(name)," +
  "article_translations!inner(locale,slug,title,excerpt,body,seo_title," +
  "seo_description,sources,correction_notes,is_machine_translated," +
  "reviewed_translation)";

/** PostgREST returns an embedded to-one either bare or wrapped in an array. */
function authorName(value: ArticleRow["authors"]): string | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return row?.name ?? null;
}

/** jsonb columns are `unknown` until proven otherwise — never trust the shape. */
function toSources(value: unknown): ArticleSource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { name, url } = entry as Record<string, unknown>;
    if (typeof name !== "string" || typeof url !== "string") return [];
    // Only http(s): a source link is rendered as an anchor.
    if (!/^https?:\/\//i.test(url)) return [];
    return [{ name, url }];
  });
}

function toCorrections(value: unknown): ArticleCorrection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { date, note } = entry as Record<string, unknown>;
    if (typeof date !== "string" || typeof note !== "string") return [];
    return [{ date, note }];
  });
}

function toSummary(row: ArticleRow): ArticleSummary | null {
  const translation = (row.article_translations ?? [])[0];
  if (!translation || !isArticleType(row.article_type)) return null;
  return {
    id: row.id,
    type: row.article_type,
    isSponsored: row.is_sponsored,
    sponsorName: row.sponsor_name,
    publishedAt: row.published_at,
    heroImagePath: row.hero_image_path,
    title: translation.title,
    slug: translation.slug,
    excerpt: translation.excerpt,
    authorName: authorName(row.authors),
  };
}

export async function getPublishedArticles(
  locale: Locale,
  {
    limit = 30,
    type,
    topic,
  }: { limit?: number; type?: ArticleType; topic?: string } = {},
): Promise<ArticleSummary[] | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;

  try {
    let query = supabase
      .from("articles")
      .select(topic ? `${LIST_SELECT}${TAG_JOIN}` : LIST_SELECT)
      .eq("status", "published")
      .eq("article_translations.locale", locale)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (type) query = query.eq("article_type", type);
    if (topic) query = query.eq("article_tags.tags.slug", topic);

    const { data, error } = await query;
    if (error) {
      logger.warn("content.public_list_failed", { dbError: error.message });
      return null;
    }
    return ((data ?? []) as unknown as ArticleRow[])
      .map(toSummary)
      .filter((a): a is ArticleSummary => a !== null);
  } catch (err) {
    logger.warn("content.public_list_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

/** Headlines for the breaking-news strip in the site header. */
export async function getBreakingNews(
  locale: Locale,
  limit = 5,
): Promise<BreakingItem[] | null> {
  const articles = await getPublishedArticles(locale, {
    limit,
    type: "breaking_news",
  });
  if (articles === null) return null;
  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    publishedAt: a.publishedAt,
  }));
}

export async function getArticleBySlug(
  locale: Locale,
  slug: string,
): Promise<FullArticle | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("articles")
      .select(DETAIL_SELECT)
      .eq("status", "published")
      .eq("article_translations.locale", locale)
      .eq("article_translations.slug", slug)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        logger.warn("content.public_detail_failed", { dbError: error.message });
      }
      return null;
    }

    const row = data as unknown as ArticleRow;
    const summary = toSummary(row);
    const translation = (row.article_translations ?? [])[0];
    if (!summary || !translation) return null;

    return {
      ...summary,
      body: translation.body ?? "",
      seoTitle: translation.seo_title ?? null,
      seoDescription: translation.seo_description ?? null,
      sources: toSources(translation.sources),
      corrections: toCorrections(translation.correction_notes),
      isMachineTranslated: translation.is_machine_translated ?? false,
      reviewedTranslation: translation.reviewed_translation ?? false,
      updatedAt: row.updated_at ?? null,
    };
  } catch (err) {
    logger.warn("content.public_detail_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

// ------------------------------------------------------------
// Vlogs
// ------------------------------------------------------------

export interface VideoSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  provider: string | null;
  providerRef: string | null;
  isShort: boolean;
  durationSeconds: number | null;
  publishedAt: string | null;
}

interface VideoRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  provider: string | null;
  provider_ref: string | null;
  is_short: boolean;
  duration_s: number | null;
  published_at: string | null;
}

const VIDEO_SELECT =
  "id,title,slug,description,provider,provider_ref,is_short,duration_s,published_at";

function toVideo(row: VideoRow): VideoSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    provider: row.provider,
    providerRef: row.provider_ref,
    isShort: row.is_short,
    durationSeconds: row.duration_s,
    publishedAt: row.published_at,
  };
}

export async function getPublishedVideos(
  locale: Locale,
  limit = 30,
): Promise<VideoSummary[] | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("videos")
      .select(VIDEO_SELECT)
      .eq("status", "published")
      .eq("locale", locale)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn("media.public_list_failed", { dbError: error.message });
      return null;
    }
    return ((data ?? []) as unknown as VideoRow[]).map(toVideo);
  } catch (err) {
    logger.warn("media.public_list_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

export async function getVideoBySlug(
  locale: Locale,
  slug: string,
): Promise<VideoSummary | null> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("videos")
      .select(VIDEO_SELECT)
      .eq("status", "published")
      .eq("locale", locale)
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    return toVideo(data as unknown as VideoRow);
  } catch {
    return null;
  }
}
