import type { Metadata } from "next";
import Link from "next/link";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import { COMMODITIES } from "@/lib/markets/asset-data";

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
    path: "/commodities",
    title: `${dict.assets.commoditiesTitle} — ${dict.site.name}`,
    description: dict.assets.commoditiesLead,
  });
}

export default async function CommoditiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const a = dict.assets;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              {
                name: a.commoditiesTitle,
                url: `${base}/${safeLocale}/commodities`,
              },
            ]),
          ),
        }}
      />
      <h1 className="text-3xl font-bold sm:text-4xl">{a.commoditiesTitle}</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">{a.commoditiesLead}</p>
      <div className="mt-3 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
        {dict.data.notConnected}
      </div>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {COMMODITIES.map((commodity) => (
          <li key={commodity.code}>
            <Link
              href={`/${safeLocale}/commodities/${commodity.slug}`}
              className="block h-full rounded-lg border border-border bg-surface p-5 hover:border-brand"
            >
              <span className="flex items-baseline gap-2">
                <span className="font-latin font-semibold text-brand">
                  {commodity.name}
                </span>
                <span className="font-latin text-xs text-ink-muted">
                  {commodity.currency}/{commodity.unit}
                </span>
              </span>
              <span
                className="mt-2 block text-sm leading-relaxed text-ink-muted font-latin"
                dir="ltr"
                lang="en"
              >
                {commodity.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-ink-muted">{dict.data.notAdvice}</p>
    </div>
  );
}
