import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

const TRUST_LINKS: { key: keyof Dictionary["footer"]; path: string }[] = [
  { key: "about", path: "/about" },
  { key: "contact", path: "/contact" },
  { key: "advertise", path: "/advertise" },
  { key: "editorialPolicy", path: "/editorial-policy" },
  { key: "correctionsPolicy", path: "/corrections-policy" },
  { key: "advertisingDisclosure", path: "/advertising-disclosure" },
  { key: "financialDisclaimer", path: "/financial-disclaimer" },
];

const LEGAL_LINKS: { key: keyof Dictionary["footer"]; path: string }[] = [
  { key: "privacyPolicy", path: "/privacy-policy" },
  { key: "cookiePolicy", path: "/cookie-policy" },
  { key: "termsOfUse", path: "/terms-of-use" },
  { key: "dataRequest", path: "/data-request" },
];

export function Footer({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav
          aria-label={dict.a11y.footerNavigation}
          className="grid gap-8 sm:grid-cols-2"
        >
          <div>
            <h2 className="mb-3 text-sm font-semibold text-ink-muted">
              {dict.footer.trust}
            </h2>
            <ul className="space-y-2">
              {TRUST_LINKS.map(({ key, path }) => (
                <li key={key}>
                  <Link
                    href={`/${locale}${path}`}
                    className="text-sm hover:text-brand"
                  >
                    {dict.footer[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-ink-muted">
              {dict.footer.legal}
            </h2>
            <ul className="space-y-2">
              {LEGAL_LINKS.map(({ key, path }) => (
                <li key={key}>
                  <Link
                    href={`/${locale}${path}`}
                    className="text-sm hover:text-brand"
                  >
                    {dict.footer[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <p className="mt-8 border-t border-border pt-6 text-xs leading-relaxed text-ink-muted">
          {dict.disclaimer.short}
        </p>
        <p className="mt-4 text-xs text-ink-muted">
          © {year} CoinJecko / Finance Hub. {dict.footer.rightsReserved}
        </p>
      </div>
    </footer>
  );
}
