import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { COMMODITIES, getCommodityBySlug } from "@/lib/markets/asset-data";
import { AssetDetail } from "@/components/markets/AssetDetail";
import {
  fetchCommodityQuotes,
  formatCommodityPrice,
} from "@/lib/markets/commodity-prices";
import { formatQuoteTime } from "@/lib/markets/quote-time";

export const dynamicParams = false;

/** Metals tick continuously; a minute matches the upstream cache. */
export const revalidate = 60;

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    COMMODITIES.map((c) => ({ locale, slug: c.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const commodity = getCommodityBySlug(slug);
  if (!commodity) return {};
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  return buildPageMetadata({
    locale: safeLocale,
    path: `/commodities/${slug}`,
    title: `${commodity.name} — market guide & context`,
    description: commodity.description,
  });
}

export default async function CommodityPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const commodity = getCommodityBySlug(slug);
  if (!commodity) notFound();
  const dict = await getDictionary(locale);

  const quotes = await fetchCommodityQuotes();
  const live = quotes?.[commodity.slug] ?? null;

  return (
    <AssetDetail
      quote={
        live
          ? {
              price: formatCommodityPrice(live.price),
              quotedAt: formatQuoteTime(live.quotedAt, locale),
              provider: live.provider,
              providerUrl: live.providerUrl,
              isReference: live.isReference,
            }
          : null
      }
      locale={locale}
      dict={dict}
      sectionTitle={dict.assets.commoditiesTitle}
      sectionPath="/commodities"
      title={commodity.name}
      chips={[commodity.code, `${commodity.currency}/${commodity.unit}`]}
      description={commodity.description}
      whyItMatters={commodity.whyItMatters}
      facts={[
        { label: dict.assets.symbol, value: commodity.code },
        { label: dict.assets.unit, value: commodity.unit },
        { label: dict.assets.quotedIn, value: commodity.currency },
      ]}
      faq={[
        { q: `What is the ${commodity.name} market?`, a: commodity.description },
        { q: `Why does ${commodity.name} matter?`, a: commodity.whyItMatters },
        {
          q: "Is this investment advice?",
          a: "No. CoinJecko / Finance Hub publishes market information and educational context only. Always conduct independent research and consult a qualified professional before making financial decisions.",
        },
      ]}
    />
  );
}
