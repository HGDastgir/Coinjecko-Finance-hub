import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { FOREX_PAIRS, getPairBySlug } from "@/lib/markets/asset-data";
import { AssetDetail } from "@/components/markets/AssetDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    FOREX_PAIRS.map((p) => ({ locale, slug: p.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const pair = getPairBySlug(slug);
  if (!pair) return {};
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  return buildPageMetadata({
    locale: safeLocale,
    path: `/forex/${slug}`,
    title: `${pair.base}/${pair.quote} exchange rate — guide & context`,
    description: pair.description,
  });
}

export default async function ForexPairPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const pair = getPairBySlug(slug);
  if (!pair) notFound();
  const dict = await getDictionary(locale);
  const name = `${pair.base}/${pair.quote}`;

  return (
    <AssetDetail
      locale={locale}
      dict={dict}
      sectionTitle={dict.assets.forexTitle}
      sectionPath="/forex"
      title={name}
      chips={[pair.base, pair.quote]}
      description={pair.description}
      whyItMatters={pair.whyItMatters}
      facts={[
        { label: dict.assets.from, value: pair.base },
        { label: dict.assets.to, value: pair.quote },
      ]}
      faq={[
        { q: `What is the ${name} exchange rate?`, a: pair.description },
        { q: `Why does ${name} matter?`, a: pair.whyItMatters },
        {
          q: "Is this investment advice?",
          a: "No. CoinJecko / Finance Hub publishes market information and educational context only. Always conduct independent research and consult a qualified professional before making financial decisions.",
        },
      ]}
    />
  );
}
