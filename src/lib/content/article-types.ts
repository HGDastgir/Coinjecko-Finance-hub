/**
 * Mirrors the `article_type` enum in supabase/migrations/0002_content.sql.
 * Change one, change the other — same rule as the role matrix and the
 * editorial workflow.
 */

export const ARTICLE_TYPES = [
  "breaking_news",
  "market_update",
  "explainer",
  "analysis",
  "opinion",
  "interview",
  "sponsored",
] as const;

export type ArticleType = (typeof ARTICLE_TYPES)[number];

export function isArticleType(value: unknown): value is ArticleType {
  return (
    typeof value === "string" &&
    (ARTICLE_TYPES as readonly string[]).includes(value)
  );
}

/** Human labels for the admin UI, which is English-only for now. */
export const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  breaking_news: "Breaking news",
  market_update: "Market update",
  explainer: "Explainer",
  analysis: "Analysis",
  opinion: "Opinion",
  interview: "Interview",
  sponsored: "Sponsored",
};
