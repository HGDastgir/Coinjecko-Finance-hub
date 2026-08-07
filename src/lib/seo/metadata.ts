import type { Metadata } from "next";
import { publicEnv } from "@/lib/env";
import { locales, type Locale } from "@/i18n/config";

/**
 * Central metadata builder: unique titles/descriptions, canonical
 * URLs and hreflang alternates for every page. `path` is the
 * locale-less path ("/", "/markets/kse-100", …).
 */

const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  ur: "ur_PK",
};

export interface PageMeta {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  /** Suppress indexing (utility pages, previews). */
  noIndex?: boolean;
}

function localePath(locale: Locale, path: string): string {
  return `/${locale}${path === "/" ? "" : path}`;
}

export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  noIndex,
}: PageMeta): Metadata {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const canonical = `${base}${localePath(locale, path)}`;

  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l === "ur" ? "ur-PK" : "en"] = `${base}${localePath(l, path)}`;
  }
  languages["x-default"] = `${base}${localePath("en", path)}`;

  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "CoinJecko Finance Hub",
      locale: OG_LOCALE[locale],
      type: "website",
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}
