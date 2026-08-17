import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  newsArticleSchema,
  serializeJsonLd,
} from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import { getArticleBySlug } from "@/lib/content/public-content";
import { formatPublishedDate, toDateAttribute } from "@/lib/content/format";
import { AdSlot } from "@/components/layout/AdSlot";
import { parseRichText, type RichTextBlock } from "@/lib/content/rich-text";
import { resolveImageSrc } from "@/lib/content/media";
import { StaffEditBar } from "@/components/layout/StaffEditBar";

export const revalidate = 120;

/**
 * Bodies are stored as plain text and parsed into a typed block list —
 * never injected as HTML. See lib/content/rich-text.ts for the small
 * set of line prefixes the body understands and why the mapping is
 * done here, in React, rather than by interpreting stored markup.
 */
function renderBlocks(
  blocks: RichTextBlock[],
  adLabel: string,
  locale: Locale,
  path: string,
) {
  return blocks.map((block, i) => {
    // In-article unit after the third block: past the point where the
    // reader has committed, before the piece runs long. Short pieces
    // never reach it and stay ad-free in the body.
    const ad =
      i === 3 ? (
        <AdSlot
          placement="in-article"
          label={adLabel}
          locale={locale}
          path={path}
        />
      ) : null;

    if (block.kind === "heading") {
      const Tag = block.level === 2 ? "h2" : "h3";
      return (
        <div key={i}>
          {ad}
          <Tag
            className={
              block.level === 2
                ? "mt-8 text-2xl font-semibold"
                : "mt-6 text-xl font-semibold"
            }
          >
            {block.text}
          </Tag>
        </div>
      );
    }

    if (block.kind === "list") {
      return (
        <div key={i}>
          {ad}
          <ul className="list-disc space-y-1 ps-6">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (block.kind === "image") {
      // resolveImageSrc refuses anything that is not https or a
      // bucket-relative path, so a hostile body cannot reach the DOM.
      const src = resolveImageSrc(
        block.src,
        publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      );
      if (!src) return null;
      return (
        <figure key={i} className="my-6">
          <Image
            src={src}
            alt={block.alt}
            width={1600}
            height={900}
            sizes="(max-width: 768px) 100vw, 768px"
            className="h-auto w-full rounded-lg border border-border object-contain"
          />
          {block.alt ? (
            <figcaption className="mt-2 text-center text-xs text-ink-muted">
              {block.alt}
            </figcaption>
          ) : null}
        </figure>
      );
    }

    return (
      <div key={i}>
        {ad}
        <p>{block.text}</p>
      </div>
    );
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const article = await getArticleBySlug(safeLocale, slug);

  if (!article) {
    return buildPageMetadata({
      locale: safeLocale,
      path: `/blog/${slug}`,
      title: `${dict.notFound.title} — ${dict.site.name}`,
      description: dict.notFound.description,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    locale: safeLocale,
    path: `/blog/${article.slug}`,
    title: `${article.seoTitle ?? article.title} — ${dict.site.name}`,
    description:
      article.seoDescription ?? article.excerpt ?? dict.blog.lead,
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const b = dict.blog;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;

  const article = await getArticleBySlug(safeLocale, slug);
  if (!article) notFound();

  const url = `${base}/${safeLocale}/blog/${article.slug}`;
  const heroSrc = resolveImageSrc(
    article.heroImagePath,
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  );
  const published = formatPublishedDate(article.publishedAt, safeLocale);
  const updated = formatPublishedDate(article.updatedAt, safeLocale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              { name: b.title, url: `${base}/${safeLocale}/blog` },
              { name: article.title, url },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            newsArticleSchema({
              locale: safeLocale,
              url,
              headline: article.title,
              description: article.seoDescription ?? article.excerpt,
              datePublished: toDateAttribute(article.publishedAt),
              dateModified: toDateAttribute(article.updatedAt),
              authorName: article.authorName,
            }),
          ),
        }}
      />

      <StaffEditBar
        locale={safeLocale}
        editPath={`/admin/articles/${article.id}`}
        label={b.staffEditing}
      />

      <Link
        href={`/${safeLocale}/blog`}
        className="text-sm text-ink-muted hover:text-brand"
      >
        ← {b.backToBlog}
      </Link>

      <article className="mt-4">
        <p className="text-sm text-sect-blog">{b.typeLabels[article.type]}</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{article.title}</h1>

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          {article.authorName ? (
            <span>
              {b.by} {article.authorName}
            </span>
          ) : null}
          {published ? (
            <time dateTime={toDateAttribute(article.publishedAt)}>
              {b.publishedOn} {published}
            </time>
          ) : null}
          {updated && updated !== published ? (
            <time dateTime={toDateAttribute(article.updatedAt)}>
              {b.updatedOn} {updated}
            </time>
          ) : null}
        </p>

        {article.isSponsored ? (
          <p className="mt-4 rounded-lg border border-accent bg-surface p-3 text-sm font-semibold text-accent">
            {b.sponsoredLabel}
            {article.sponsorName ? ` — ${article.sponsorName}` : ""}
          </p>
        ) : null}

        {safeLocale === "ur" &&
        article.isMachineTranslated &&
        !article.reviewedTranslation ? (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-surface p-3 text-sm text-ink-muted">
            {b.machineTranslated}
          </p>
        ) : null}

        {heroSrc ? (
          <Image
            src={heroSrc}
            alt=""
            width={1600}
            height={900}
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="mt-6 h-auto w-full rounded-lg border border-border object-cover"
          />
        ) : null}

        {article.excerpt ? (
          <p className="mt-6 text-lg leading-relaxed text-ink-muted">
            {article.excerpt}
          </p>
        ) : null}

        <div className="mt-6 space-y-4 leading-relaxed">
          {renderBlocks(
            parseRichText(article.body),
            dict.ads.label,
            safeLocale,
            `/blog/${article.slug}`,
          )}
        </div>

        <AdSlot
          placement="article-end"
          label={dict.ads.label}
          locale={safeLocale}
          path={`/blog/${article.slug}`}
        />

        {article.sources.length > 0 ? (
          <section aria-labelledby="sources-heading" className="mt-10">
            <h2 id="sources-heading" className="text-lg font-semibold">
              {b.sourcesTitle}
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              {article.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    rel="nofollow noopener noreferrer"
                    target="_blank"
                    className="text-brand hover:underline"
                  >
                    {source.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {article.corrections.length > 0 ? (
          <section aria-labelledby="corrections-heading" className="mt-8">
            <h2 id="corrections-heading" className="text-lg font-semibold">
              {b.correctionsTitle}
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-ink-muted">
              {article.corrections.map((correction) => (
                <li key={`${correction.date}-${correction.note}`}>
                  <span className="font-latin">{correction.date}</span> —{" "}
                  {correction.note}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>

      <p className="mt-10 text-xs text-ink-muted">{dict.data.notAdvice}</p>
    </div>
  );
}
