import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { CRYPTO_ASSETS, getCryptoBySlug } from "@/lib/markets/asset-data";
import { AssetDetail } from "@/components/markets/AssetDetail";
import { fetchCryptoMarkets } from "@/lib/markets/crypto-market";

/**
 * The market table now lists the top 250 coins, so any of them must
 * resolve here. The seven curated assets are prerendered with their
 * editorial context; the rest render on demand from provider data
 * alone — with no invented description, because we have not written
 * one for them.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    CRYPTO_ASSETS.map((a) => ({ locale, slug: a.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const asset = getCryptoBySlug(slug);
  if (!asset) return {};
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  return buildPageMetadata({
    locale: safeLocale,
    path: `/crypto/${slug}`,
    title: `${asset.name} (${asset.symbol}) — guide, data & context`,
    description: asset.description,
  });
}

export default async function CoinPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const asset = getCryptoBySlug(slug);
  if (!asset) {
    // Not one of our covered assets — fall back to the live market
    // list. If the provider does not know it either, it is a 404.
    const markets = await fetchCryptoMarkets();
    const quote = markets?.quotes.find((q) => q.slug === slug);
    if (!quote) notFound();

    return (
      <AssetDetail
        locale={locale}
        dict={dict}
        sectionTitle={dict.assets.cryptoTitle}
        sectionPath="/crypto"
        title={quote.name}
        chips={[quote.symbol]}
        // No editorial copy exists for this coin, and inventing one is
        // exactly what the honest-data rule forbids. Say so plainly.
        description={dict.assets.noEditorialCoverage}
        whyItMatters=""
        riskNote={dict.assets.cryptoRisk}
        facts={[
          { label: dict.assets.symbol, value: quote.symbol },
          { label: dict.assets.quotedIn, value: "USD" },
        ]}
        faq={[]}
      />
    );
  }

  return (
    <AssetDetail
      locale={locale}
      dict={dict}
      sectionTitle={dict.assets.cryptoTitle}
      sectionPath="/crypto"
      title={asset.name}
      chips={[asset.symbol]}
      description={asset.description}
      whyItMatters={asset.whyItMatters}
      riskNote={dict.assets.cryptoRisk}
      facts={[
        { label: dict.assets.symbol, value: asset.symbol },
        { label: dict.assets.quotedIn, value: "USD" },
      ]}
      faq={[
        { q: `What is ${asset.name}?`, a: asset.description },
        { q: `Why does ${asset.name} matter?`, a: asset.whyItMatters },
        {
          q: "Is this investment advice?",
          a: "No. CoinJecko / Finance Hub publishes market information and educational context only. Crypto markets are highly volatile; always conduct independent research and consult a qualified professional before making financial decisions.",
        },
      ]}
    />
  );
}
