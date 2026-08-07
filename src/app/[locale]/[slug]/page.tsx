import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { LEGAL_PAGES, LEGAL_SLUGS } from "@/content/legal-pages";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";

/**
 * Trust & legal pages (/en/privacy-policy, /ur/editorial-policy, …).
 * Slug allowlist only — anything else 404s. English is authoritative;
 * Urdu routes show a pending-translation notice until reviewed
 * translations ship.
 */

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    LEGAL_SLUGS.map((slug) => ({ locale, slug })),
  );
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = LEGAL_PAGES[slug];
  if (!page) return {};
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  return buildPageMetadata({
    locale: safeLocale,
    path: `/${slug}`,
    title: `${safeLocale === "ur" ? page.titleUr : page.titleEn} — CoinJecko Finance Hub`,
    description: page.description,
  });
}

export default async function LegalPageRoute({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = LEGAL_PAGES[slug];
  if (!page || !isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;

  const title = locale === "ur" ? page.titleUr : page.titleEn;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${locale}` },
              { name: title, url: `${base}/${locale}/${slug}` },
            ]),
          ),
        }}
      />
      <h1 className="text-3xl font-bold">{title}</h1>

      {/* The pending-legal-review notice belongs on policy documents,
          not on editorial pages like About or Advertise. */}
      {page.isLegalDocument === false ? null : (
        <p className="mt-4 rounded-md border border-accent/40 bg-surface p-3 text-sm text-ink-muted">
          {dict.legalNotice.draft}
        </p>
      )}
      {locale === "ur" && dict.legalNotice.urduPending ? (
        <p className="mt-2 rounded-md border border-border bg-surface p-3 text-sm text-ink-muted">
          {dict.legalNotice.urduPending}
        </p>
      ) : null}

      <div
        className={locale === "ur" ? "font-latin" : undefined}
        dir="ltr"
        lang="en"
      >
        {page.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-xl font-semibold">{section.heading}</h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="mt-3 leading-relaxed text-ink-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
