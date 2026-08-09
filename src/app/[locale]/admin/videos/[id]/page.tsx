import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getEditableVideo } from "@/lib/content/admin-content";
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
    path: "/admin/videos",
    title: "Edit video — CoinJecko Finance Hub",
    description: "Media administration.",
    noIndex: true,
  });
}

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect(`/${safeLocale}/admin`);

  const allowed = hasPermission(user.role, "media.manage_video");
  const video = allowed ? await getEditableVideo(id) : null;
  // 0002 ties video writes to the row's creator, so say up front that
  // this one is read-only rather than failing at save time.
  const ownRow = video !== null && video.createdBy === user.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/${safeLocale}/admin/videos`}
        className="text-sm text-ink-muted hover:text-brand"
      >
        ← Videos
      </Link>

      {!allowed ? (
        <>
          <h1 className="mt-3 text-2xl font-semibold">Edit video</h1>
          <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
            Managing videos needs the media.manage_video permission, which
            your role does not hold.
          </p>
        </>
      ) : video === null ? (
        <>
          <h1 className="mt-3 text-2xl font-semibold">Video unavailable</h1>
          <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
            This video does not exist, or the media backend is not reachable.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-3 text-2xl font-semibold">{video.title}</h1>
          {!ownRow ? (
            <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
              Only the person who added this video can edit it, so it is shown
              read-only.
            </p>
          ) : (
            <VideoEditor locale={safeLocale} video={video} />
          )}
        </>
      )}
    </div>
  );
}
