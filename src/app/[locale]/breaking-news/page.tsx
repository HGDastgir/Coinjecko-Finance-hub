import type { Metadata } from "next";
import Link from "next/link";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import { getPublishedArticles } from "@/lib/content/public-content";
import { formatPublishedDate, toDateAttribute } from "@/lib/content/format";
import { AdSlot } from "@/components/layout/AdSlot";

/** Breaking news is the fastest-moving surface on the site. */
export const revalidate = 60;

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
    path: "/breaking-news",
    title: `${dict.breaking.title} — ${dict.site.name}`,
    description: dict.breaking.lead,
  });
}

export default async function BreakingNewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const b = dict.breaking;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;

  // The same article_type the header strip reads, in full rather than
  // the top handful.
  const items = await getPublishedArticles(safeLocale, {
    type: "breaking_news",
    limit: 50,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              { name: b.title, url: `${base}/${safeLocale}/breaking-news` },
            ]),
          ),
        }}
      />

      <h1 className="text-3xl font-bold sm:text-4xl">{b.title}</h1>
      <span
        aria-hidden="true"
        className="mt-3 block h-1 w-16 rounded-full bg-down"
      />
      <p className="mt-4 max-w-2xl text-ink-muted">{b.lead}</p>

      <AdSlot
        placement="top-leaderboard"
        label={dict.ads.label}
        locale={safeLocale}
        path="/breaking-news"
      />

      {items === null ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface p-4 text-sm leading-relaxed text-ink-muted">
          {b.gate}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface p-4 text-sm leading-relaxed text-ink-muted">
          {b.empty}
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {items.map((item) => {
            const date = formatPublishedDate(item.publishedAt, safeLocale);
            return (
              <li key={item.id}>
                <article className="rounded-lg border border-border bg-surface p-5">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                    <span className="font-semibold uppercase tracking-wide text-down">
                      {dict.breaking.label}
                    </span>
                    {date ? (
                      <time dateTime={toDateAttribute(item.publishedAt)}>
                        {dict.blog.publishedOn} {date}
                      </time>
                    ) : null}
                    {item.authorName ? (
                      <span>
                        {dict.blog.by} {item.authorName}
                      </span>
                    ) : null}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    <Link
                      href={`/${safeLocale}/blog/${item.slug}`}
                      className="hover:text-brand"
                    >
                      {item.title}
                    </Link>
                  </h2>
                  {item.excerpt ? (
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {item.excerpt}
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
