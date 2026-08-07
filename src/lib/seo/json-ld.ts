import { publicEnv } from "@/lib/env";
import type { Locale } from "@/i18n/config";

/**
 * JSON-LD structured data builders. Only emit schema that truthfully
 * describes the page — never mark content as something it is not.
 * (JSON-LD <script type="application/ld+json"> blocks are inert data
 * and are not affected by the script-src CSP.)
 */

type JsonLd = Record<string, unknown>;

export function organizationSchema(): JsonLd {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CoinJecko Finance Hub",
    url: base,
    logo: `${base}/icon.svg`,
  };
}

export function webSiteSchema(locale: Locale): JsonLd {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CoinJecko Finance Hub",
    url: `${base}/${locale}`,
    inLanguage: locale === "ur" ? "ur-PK" : "en",
  };
}

export function breadcrumbSchema(
  items: { name: string; url: string }[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function serializeJsonLd(schema: JsonLd): string {
  // "<" escaped to prevent </script> breakout if any value ever
  // carries user-controlled text.
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
