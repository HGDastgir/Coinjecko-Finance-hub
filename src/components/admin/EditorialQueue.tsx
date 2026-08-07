import { ArticleRowActions } from "@/components/admin/ArticleRowActions";
import {
  availableTransitions,
  CONTENT_STATUSES,
  type ContentStatus,
} from "@/lib/content/workflow";
import { countByStatus, type QueueArticle } from "@/lib/content/articles";
import type { Role } from "@/lib/auth/permissions";
import type { Locale } from "@/i18n/config";

/**
 * The editorial queue. Admin surfaces stay English-only for now — the
 * bilingual requirement covers the public site, and mixing a half
 * translated CMS into the dictionaries would break the EN/UR parity
 * the Dictionary type depends on.
 */

const STATUS_STYLE: Record<ContentStatus, string> = {
  draft: "text-ink-muted",
  review: "text-accent",
  published: "text-up",
  approved: "text-brand",
  archived: "text-ink-muted line-through",
};

function StatusPill({ status }: { status: ContentStatus }) {
  return (
    <span
      className={`rounded-full border border-border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toISOString().slice(0, 10);
}

export function EditorialQueue({
  articles,
  role,
  userId,
  locale,
}: {
  articles: readonly QueueArticle[];
  role: Role | null;
  userId: string;
  locale: Locale;
}) {
  const counts = countByStatus(articles);

  return (
    <section aria-labelledby="queue-heading" className="mt-10">
      <h2 id="queue-heading" className="text-xl font-semibold">
        Editorial queue
      </h2>

      <dl className="mt-3 flex flex-wrap gap-2">
        {CONTENT_STATUSES.map((status) => (
          <div
            key={status}
            className="rounded-lg border border-border bg-surface px-3 py-2"
          >
            <dt className="text-xs text-ink-muted">{status}</dt>
            <dd className="font-latin text-lg font-semibold">
              {counts[status]}
            </dd>
          </div>
        ))}
      </dl>

      {articles.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          No articles yet. Once the editorial team drafts content it appears
          here with its workflow state.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {articles.map((article) => {
            const english = article.translations.find((t) => t.locale === "en");
            const urdu = article.translations.find((t) => t.locale === "ur");
            const transitions = availableTransitions(
              role,
              article.status,
              article.createdBy === userId,
            );

            return (
              <li
                key={article.id}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium">
                      {english?.title ?? urdu?.title ?? "(untitled)"}
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      <span className="font-latin">{article.articleType}</span>
                      {" · updated "}
                      <span className="font-latin">
                        {formatDate(article.updatedAt)}
                      </span>
                      {article.publishedAt ? (
                        <>
                          {" · published "}
                          <span className="font-latin">
                            {formatDate(article.publishedAt)}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <StatusPill status={article.status} />
                </div>

                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span>EN {english ? "✓" : "— missing"}</span>
                  <span>UR {urdu ? "✓" : "— missing"}</span>
                  {urdu?.isMachineTranslated && !urdu.reviewedTranslation ? (
                    <span className="text-accent">
                      Urdu machine-translated, not yet reviewed
                    </span>
                  ) : null}
                  {article.isSponsored ? (
                    <span className="text-accent">
                      Sponsored — {article.sponsorName ?? "sponsor missing"}
                    </span>
                  ) : null}
                </p>

                <div className="mt-3 border-t border-border pt-3">
                  <ArticleRowActions
                    articleId={article.id}
                    locale={locale}
                    transitions={transitions}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
