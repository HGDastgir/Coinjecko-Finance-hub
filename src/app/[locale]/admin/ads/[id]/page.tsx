import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getEditableAd } from "@/lib/content/admin-ads";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdEditor } from "@/components/admin/AdEditor";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  return buildPageMetadata({
    locale: safeLocale,
    path: "/admin/ads",
    title: "Edit campaign — CoinJecko Finance Hub",
    description: "Campaign administration.",
    noIndex: true,
  });
}

export default async function EditAdPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect(`/${safeLocale}/admin`);
  if (!hasPermission(user.role, "ads.manage")) {
    redirect(`/${safeLocale}/admin/ads`);
  }

  const ad = await getEditableAd(id);
  if (!ad) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/${safeLocale}/admin/ads`}
        className="text-sm text-ink-muted underline"
      >
        ← Advertising
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{ad.name}</h1>
      <AdEditor locale={safeLocale} ad={ad} />
    </div>
  );
}
