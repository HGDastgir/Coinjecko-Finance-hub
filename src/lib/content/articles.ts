import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isContentStatus, type ContentStatus } from "@/lib/content/workflow";
import type { Locale } from "@/i18n/config";

/**
 * Editorial queue reads for the admin CMS.
 *
 * Uses the RLS-bound request client, never the service-role client:
 * the caller's own role decides what comes back. Reading unpublished
 * rows needs content.review, so a user without it simply sees less
 * rather than being handed data the database would refuse.
 *
 * Returns null when Supabase is not configured, so the UI can show the
 * same honest gate the market surfaces use instead of an empty list
 * that looks like "no articles".
 */

export interface QueueTranslation {
  locale: Locale;
  title: string;
  slug: string;
  isMachineTranslated: boolean;
  reviewedTranslation: boolean;
}

export interface QueueArticle {
  id: string;
  status: ContentStatus;
  articleType: string;
  isSponsored: boolean;
  sponsorName: string | null;
  createdBy: string;
  updatedAt: string;
  publishedAt: string | null;
  translations: QueueTranslation[];
}

interface TranslationRow {
  locale: string;
  title: string;
  slug: string;
  is_machine_translated: boolean;
  reviewed_translation: boolean;
}

interface ArticleRow {
  id: string;
  status: string;
  article_type: string;
  is_sponsored: boolean;
  sponsor_name: string | null;
  created_by: string;
  updated_at: string;
  published_at: string | null;
  article_translations: TranslationRow[] | null;
}

const SELECT =
  "id,status,article_type,is_sponsored,sponsor_name,created_by,updated_at,published_at," +
  "article_translations(locale,title,slug,is_machine_translated,reviewed_translation)";

function toQueueArticle(row: ArticleRow): QueueArticle | null {
  if (!isContentStatus(row.status)) {
    logger.warn("content.unknown_status", { articleId: row.id });
    return null;
  }
  return {
    id: row.id,
    status: row.status,
    articleType: row.article_type,
    isSponsored: row.is_sponsored,
    sponsorName: row.sponsor_name,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    translations: (row.article_translations ?? [])
      .filter((t): t is TranslationRow & { locale: Locale } =>
        t.locale === "en" || t.locale === "ur",
      )
      .map((t) => ({
        locale: t.locale,
        title: t.title,
        slug: t.slug,
        isMachineTranslated: t.is_machine_translated,
        reviewedTranslation: t.reviewed_translation,
      })),
  };
}

export async function getEditorialQueue(
  limit = 50,
): Promise<QueueArticle[] | null> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv;
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("articles")
      .select(SELECT)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn("content.queue_query_failed", { dbError: error.message });
      return null;
    }

    return ((data ?? []) as unknown as ArticleRow[])
      .map(toQueueArticle)
      .filter((a): a is QueueArticle => a !== null);
  } catch (err) {
    logger.warn("content.queue_query_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

/** Status + owner for one article, used to authorise a transition. */
export async function getArticleForTransition(
  articleId: string,
): Promise<{ status: ContentStatus; createdBy: string } | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("articles")
      .select("status,created_by")
      .eq("id", articleId)
      .single();

    if (error || !data) return null;
    const row = data as { status: string; created_by: string };
    if (!isContentStatus(row.status)) return null;
    return { status: row.status, createdBy: row.created_by };
  } catch {
    return null;
  }
}

export function countByStatus(
  articles: readonly QueueArticle[],
): Record<ContentStatus, number> {
  const counts = {
    draft: 0,
    review: 0,
    approved: 0,
    published: 0,
    archived: 0,
  } satisfies Record<ContentStatus, number>;
  for (const article of articles) counts[article.status] += 1;
  return counts;
}
