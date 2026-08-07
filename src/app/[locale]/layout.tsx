import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";

/**
 * Self-hosted at build time by next/font, so it is served from our own
 * origin — `font-src 'self'` in the CSP stays untouched and no
 * third-party font host has to be allow-listed.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});
import {
  isLocale,
  localeDirection,
  locales,
  type Locale,
} from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { CryptoTicker } from "@/components/markets/CryptoTicker";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  organizationSchema,
  serializeJsonLd,
  webSiteSchema,
} from "@/lib/seo/json-ld";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return buildPageMetadata({
    locale,
    path: "/",
    title: `${dict.site.name} — ${dict.site.tagline}`,
    description: dict.site.description,
  });
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const locale: Locale = localeParam;
  const dict = await getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={localeDirection[locale]}
      className={`h-full ${jakarta.variable}`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <a href="#main-content" className="skip-link font-latin">
          {dict.a11y.skipToContent}
        </a>
        <CryptoTicker locale={locale} labels={dict.ticker} />
        <Header locale={locale} dict={dict} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer locale={locale} dict={dict} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(organizationSchema()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(webSiteSchema(locale)),
          }}
        />
      </body>
    </html>
  );
}
