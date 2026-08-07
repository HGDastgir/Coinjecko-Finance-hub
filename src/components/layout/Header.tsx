import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS: { key: keyof Dictionary["nav"]; path: string }[] = [
  { key: "markets", path: "/markets" },
  { key: "crypto", path: "/crypto" },
  { key: "forex", path: "/forex" },
  { key: "commodities", path: "/commodities" },
  { key: "economy", path: "/economy" },
  { key: "business", path: "/business" },
  { key: "personalFinance", path: "/personal-finance" },
];

export function Header({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link
          href={`/${locale}`}
          className="me-auto flex items-baseline gap-2"
        >
          <span className="font-latin text-xl font-bold tracking-tight text-brand">
            CoinJecko
          </span>
          <span className="text-sm text-ink-muted">{dict.site.shortName}</span>
        </Link>
        <LocaleSwitcher
          currentLocale={locale}
          label={dict.a11y.switchLanguage}
          ariaLabel={dict.a11y.switchLanguageLabel}
        />
        <ThemeToggle label={dict.a11y.toggleTheme} />
      </div>
      <nav aria-label={dict.a11y.mainNavigation} className="border-t border-border">
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-1">
          {NAV_ITEMS.map(({ key, path }) => (
            <li key={key} className="shrink-0">
              <Link
                href={`/${locale}${path}`}
                className="block rounded-md px-3 py-2 text-sm text-ink hover:bg-surface-raised hover:text-brand"
              >
                {dict.nav[key]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
