import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { VideoEditor } from "@/components/admin/VideoEditor";
import { buildPageMetadata } from "@/lib/seo/metadata";

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
    path: "/admin/videos/new",
    title: "Add video — CoinJecko Finance Hub",
    description: "Media administration.",
    noIndex: true,
  });
}

export default async function NewVideoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect(`/${safeLocale}/admin`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/${safeLocale}/admin/videos`}
        className="text-sm text-ink-muted hover:text-brand"
      >
        ← Videos
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Add video</h1>

      {!hasPermission(user.role, "media.manage_video") ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          Managing videos needs the media.manage_video permission, which your
          role does not hold.
        </p>
      ) : (
        <VideoEditor locale={safeLocale} video={null} />
      )}
    </div>
  );
}
