import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { CRYPTO_ASSETS, getCryptoBySlug } from "@/lib/markets/asset-data";
import { AssetDetail } from "@/components/markets/AssetDetail";

export const dynamicParams = false;

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
  const asset = getCryptoBySlug(slug);
  if (!asset) notFound();
  const dict = await getDictionary(locale);

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
