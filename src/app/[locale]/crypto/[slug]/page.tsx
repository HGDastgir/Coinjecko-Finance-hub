import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { CRYPTO_ASSETS, getCryptoBySlug } from "@/lib/markets/asset-data";
import { AssetDetail } from "@/components/markets/AssetDetail";
import { fetchCryptoMarkets } from "@/lib/markets/crypto-market";
import { coinGeckoCoinUrl } from "@/lib/markets/coingecko";
import { formatQuoteTime } from "@/lib/markets/quote-time";

/**
 * Crypto prices span nine orders of magnitude, so a fixed two-decimal
 * format would render most of the long tail as /usr/bin/bash.00. Sub-dollar
 * coins get the precision they need; the rest stay readable.
 */
function formatCoinPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  }).format(price);
}

/**
 * The quote block for a coin. CoinGecko is both the source of the
 * figure and where a reader goes for the live rate, so the provider
 * link doubles as the live-rate link rather than adding a second one.
 */
function coinQuote(
  slug: string,
  priceUsd: number,
  quotedAt: string,
  locale: Locale,
) {
  return {
    price: formatCoinPrice(priceUsd),
    quotedAt: formatQuoteTime(quotedAt, locale),
    provider: "CoinGecko",
    providerUrl: coinGeckoCoinUrl(slug) ?? "https://www.coingecko.com",
    isReference: false,
  };
}

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
        quote={coinQuote(quote.slug, quote.priceUsd, quote.quotedAt, locale)}
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

  // The coin pages used to show "provider not connected" while the
  // market table on /crypto displayed a live price for the same coin.
  // Same feed, same cache — there was no reason for the inconsistency.
  const markets = await fetchCryptoMarkets();
  const live = markets?.quotes.find((q) => q.slug === asset.slug);

  return (
    <AssetDetail
      locale={locale}
      dict={dict}
      sectionTitle={dict.assets.cryptoTitle}
      sectionPath="/crypto"
      title={asset.name}
      chips={[asset.symbol]}
      quote={
        live
          ? coinQuote(asset.slug, live.priceUsd, live.quotedAt, locale)
          : null
      }
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
