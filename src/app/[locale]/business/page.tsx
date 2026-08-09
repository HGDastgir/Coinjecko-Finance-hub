import type { Metadata } from "next";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SectionLanding } from "@/components/content/SectionLanding";
import { BUSINESS_TOPICS } from "@/content/section-topics";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  return buildPageMetadata({
    locale: safeLocale,
    path: "/business",
    title: `${dict.sections.business.title} — ${dict.site.name}`,
    description: dict.sections.business.lead,
  });
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);

  return (
    <SectionLanding
      locale={safeLocale}
      dict={dict}
      section={dict.sections.business}
      path="/business"
      topics={BUSINESS_TOPICS}
      accent="bg-sect-business"
      related={[
        { key: "economy", path: "/economy" },
        { key: "markets", path: "/markets" },
        { key: "commodities", path: "/commodities" },
      ]}
    />
  );
}
