import type { Metadata } from "next";
import Link from "next/link";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import { getPublishedArticles } from "@/lib/content/public-content";
import { formatPublishedDate, toDateAttribute } from "@/lib/content/format";
import { isTopicSlug, type TopicSlug } from "@/content/section-topics";
import { AdSlot } from "@/components/layout/AdSlot";
import { StaffEditBar } from "@/components/layout/StaffEditBar";
import type { Dictionary } from "@/i18n/get-dictionary";

/** News moves faster than the site-wide window in the locale layout. */
export const revalidate = 120;

/**
 * A topic belongs to exactly one section, but the page does not know
 * which, so both maps are consulted. An unknown slug cannot reach here
 * — isTopicSlug has already rejected it — but the lookup still falls
 * back to the raw slug rather than rendering "undefined".
 */
function topicTitle(dict: Dictionary, slug: TopicSlug): string {
  const business: Record<string, { title: string }> =
    dict.sections.business.topics;
  const personal: Record<string, { title: string }> =
    dict.sections.personalFinance.topics;
  return business[slug]?.title ?? personal[slug]?.title ?? slug;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  return buildPageMetadata({
    locale: safeLocale,
    path: "/blog",
    title: `${dict.blog.title} — ${dict.site.name}`,
    description: dict.blog.lead,
  });
}

export default async function BlogIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const b = dict.blog;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;

  // Only slugs the site actually defines reach the query; anything else
  // is treated as no filter rather than passed through to the database.
  const { topic: topicParam } = await searchParams;
  const topic = isTopicSlug(topicParam) ? topicParam : undefined;
  const topicLabel = topic ? topicTitle(dict, topic) : null;

  const articles = await getPublishedArticles(safeLocale, { topic });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              { name: b.title, url: `${base}/${safeLocale}/blog` },
            ]),
          ),
        }}
      />
      <h1 className="text-3xl font-bold sm:text-4xl">{b.title}</h1>
      <span
        aria-hidden="true"
        className="mt-3 block h-1 w-16 rounded-full bg-sect-blog"
      />
      <p className="mt-4 max-w-2xl text-ink-muted">{b.lead}</p>

      <div className="mt-6">
        <StaffEditBar
          locale={safeLocale}
          editPath="/admin/articles/new"
          label={b.staffNew}
        />
      </div>

      <AdSlot placement="top-leaderboard" label={dict.ads.label} />

      {topicLabel ? (
        <p className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-border bg-surface px-3 py-1">
            <span className="text-ink-muted">{b.filteredBy}: </span>
            <span className="font-semibold">{topicLabel}</span>
          </span>
          <Link
            href={`/${safeLocale}/blog`}
            className="text-ink-muted underline hover:text-brand"
          >
            {b.clearFilter}
          </Link>
        </p>
      ) : null}

      {articles === null ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface p-4 text-sm leading-relaxed text-ink-muted">
          {b.gate}
        </p>
      ) : articles.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface p-4 text-sm leading-relaxed text-ink-muted">
          {topicLabel ? b.emptyForTopic : b.empty}
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {articles.map((article, index) => {
            const date = formatPublishedDate(article.publishedAt, safeLocale);
            return (
              <li key={article.id}>
                {/* One in-feed unit after the fourth story, never
                    between the first few — a feed that opens with an
                    ad reads as an ad page. */}
                {index === 4 ? (
                  <AdSlot placement="in-feed" label={dict.ads.label} />
                ) : null}
                <article className="rounded-lg border border-border bg-surface p-5">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                    <span className="text-sect-blog">
                      {b.typeLabels[article.type]}
                    </span>
                    {date ? (
                      <time dateTime={toDateAttribute(article.publishedAt)}>
                        {b.publishedOn} {date}
                      </time>
                    ) : null}
                    {article.authorName ? (
                      <span>
                        {b.by} {article.authorName}
                      </span>
                    ) : null}
                    {article.isSponsored ? (
                      <span className="rounded-full border border-accent px-2 py-0.5 font-semibold text-accent">
                        {b.sponsoredLabel}
                        {article.sponsorName ? ` — ${article.sponsorName}` : ""}
                      </span>
                    ) : null}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    <Link
                      href={`/${safeLocale}/blog/${article.slug}`}
                      className="hover:text-brand"
                    >
                      {article.title}
                    </Link>
                  </h2>
                  {article.excerpt ? (
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {article.excerpt}
                    </p>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-10 text-xs text-ink-muted">{dict.data.notAdvice}</p>
    </div>
  );
}
