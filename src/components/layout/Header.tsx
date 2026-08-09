import Image from "next/image";
import Link from "next/link";
import { brandLogo } from "@/content/brand";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { BreakingNewsBar } from "./BreakingNewsBar";
import { HeaderPoster } from "./HeaderPoster";
import { LocaleSwitcher } from "./LocaleSwitcher";

/**
 * Each section carries its own hue from the spectrum in globals.css.
 * The colour is wayfinding, never the only signal — it sits beside the
 * section's own label, and the dot is decorative. Classes are written
 * out rather than built from the key because Tailwind only sees class
 * names that appear literally in the source.
 */
const NAV_ITEMS: {
  key: keyof Dictionary["nav"];
  path: string;
  dot: string;
  hover: string;
}[] = [
  {
    key: "markets",
    path: "/markets",
    dot: "bg-sect-markets",
    hover: "hover:text-sect-markets",
  },
  {
    key: "crypto",
    path: "/crypto",
    dot: "bg-sect-crypto",
    hover: "hover:text-sect-crypto",
  },
  {
    key: "forex",
    path: "/forex",
    dot: "bg-sect-forex",
    hover: "hover:text-sect-forex",
  },
  {
    key: "commodities",
    path: "/commodities",
    dot: "bg-sect-commodities",
    hover: "hover:text-sect-commodities",
  },
  {
    key: "economy",
    path: "/economy",
    dot: "bg-sect-economy",
    hover: "hover:text-sect-economy",
  },
  {
    key: "business",
    path: "/business",
    dot: "bg-sect-business",
    hover: "hover:text-sect-business",
  },
  {
    key: "personalFinance",
    path: "/personal-finance",
    dot: "bg-sect-personal",
    hover: "hover:text-sect-personal",
  },
  {
    key: "blog",
    path: "/blog",
    dot: "bg-sect-blog",
    hover: "hover:text-sect-blog",
  },
  {
    key: "vlogs",
    path: "/vlogs",
    dot: "bg-sect-vlogs",
    hover: "hover:text-sect-vlogs",
  },
];

export function Header({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  // Resolved from disk, so the header falls back to the text wordmark
  // rather than a broken image when no logo file has been added.
  const logo = brandLogo();

  return (
    <header className="border-b border-border bg-surface">
      <HeaderPoster locale={locale} dict={dict} />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href={`/${locale}`} className="me-auto flex items-center gap-2.5">
          {logo ? (
            /* Decorative: the wordmark beside it already names the
               site, so alt="" avoids a screen reader saying it twice. */
            <Image
              src={logo.src}
              alt=""
              width={36}
              height={36}
              priority
              className="h-9 w-9 shrink-0 rounded-md object-contain"
            />
          ) : null}
          <span className="flex items-baseline gap-2">
            <span className="font-latin text-xl font-bold tracking-tight text-brand">
              CoinJecko
            </span>
            <span className="text-sm text-ink-muted">
              {dict.site.shortName}
            </span>
          </span>
        </Link>
        <LocaleSwitcher
          currentLocale={locale}
          label={dict.a11y.switchLanguage}
          ariaLabel={dict.a11y.switchLanguageLabel}
        />
        <Link
          href={`/${locale}/dashboard`}
          className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-strong"
        >
          {dict.nav.dashboard}
        </Link>
      </div>
      <div className="spectrum-bar" aria-hidden="true" />
      <BreakingNewsBar locale={locale} dict={dict} />
      <nav aria-label={dict.a11y.mainNavigation}>
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-1">
          {NAV_ITEMS.map(({ key, path, dot, hover }) => (
            <li key={key} className="shrink-0">
              <Link
                href={`/${locale}${path}`}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-raised ${hover}`}
              >
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${dot}`}
                />
                {dict.nav[key]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
