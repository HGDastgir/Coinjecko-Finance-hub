import type { Metadata } from "next";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SectionLanding } from "@/components/content/SectionLanding";
import { PERSONAL_FINANCE_TOPICS } from "@/content/section-topics";

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
    path: "/personal-finance",
    title: `${dict.sections.personalFinance.title} — ${dict.site.name}`,
    description: dict.sections.personalFinance.lead,
  });
}

export default async function PersonalFinancePage({
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
      section={dict.sections.personalFinance}
      path="/personal-finance"
      topics={PERSONAL_FINANCE_TOPICS}
      accent="bg-sect-personal"
      related={[
        { key: "forex", path: "/forex" },
        { key: "crypto", path: "/crypto" },
        { key: "economy", path: "/economy" },
      ]}
    />
  );
}
