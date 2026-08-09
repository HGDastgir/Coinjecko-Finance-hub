import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { locales } from "@/i18n/config";
import { INDICES, MARKET_HUBS } from "@/lib/markets/reference-data";
import {
  COMMODITIES,
  CRYPTO_ASSETS,
  FOREX_PAIRS,
} from "@/lib/markets/asset-data";

/**
 * Static + reference-data routes; article URLs join this list from
 * the database once the content system ships. hreflang pairs are
 * expressed through the alternates.languages block per entry.
 */

const STATIC_PATHS = [
  "/",
  "/markets",
  ...MARKET_HUBS.map((h) => `/markets/${h.slug}`),
  ...INDICES.map((i) => `/markets/${i.slug}`),
  "/crypto",
  ...CRYPTO_ASSETS.map((a) => `/crypto/${a.slug}`),
  "/forex",
  ...FOREX_PAIRS.map((p) => `/forex/${p.slug}`),
  "/commodities",
  ...COMMODITIES.map((c) => `/commodities/${c.slug}`),
  "/economy",
  "/business",
  "/personal-finance",
  "/breaking-news",
  "/blog",
  "/vlogs",
  "/editorial-policy",
  "/corrections-policy",
  "/advertising-disclosure",
  "/financial-disclaimer",
  "/privacy-policy",
  "/cookie-policy",
  "/terms-of-use",
  "/data-request",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const now = new Date();

  return STATIC_PATHS.map((path) => {
    const suffix = path === "/" ? "" : path;
    const languages: Record<string, string> = {};
    for (const l of locales) {
      languages[l === "ur" ? "ur-PK" : "en"] = `${base}/${l}${suffix}`;
    }
    const isDataPage =
      path.startsWith("/markets") ||
      path.startsWith("/crypto") ||
      path.startsWith("/forex") ||
      path.startsWith("/commodities");
    return {
      url: `${base}/en${suffix}`,
      lastModified: now,
      changeFrequency:
        path === "/" ? "hourly" : isDataPage ? "daily" : "monthly",
      priority: path === "/" || path === "/markets" ? 1 : isDataPage ? 0.8 : 0.5,
      alternates: { languages },
    };
  });
}
