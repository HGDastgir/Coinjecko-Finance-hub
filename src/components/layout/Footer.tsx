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
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span>
            © {year} CoinJecko / Finance Hub. {dict.footer.rightsReserved}
          </span>
          {/* The newsroom's way in. Discoverability is not the access
              control here — roles and row-level security are — so
              hiding the link only cost staff time.

              Points at sign-in, NOT /admin: the admin gate fails closed
              to the homepage, so a link labelled "sign in" that landed
              there would look broken. `next` carries the reader on to
              admin once authenticated, and safeNextPath() rejects it if
              it is ever anything but a same-locale path. */}
          <Link
            href={`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/admin`)}`}
            className="hover:text-brand"
            rel="nofollow"
          >
            {dict.footer.staffSignIn}
          </Link>
        </p>
      </div>
    </footer>
  );
}
