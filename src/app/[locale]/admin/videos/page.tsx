import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listVideos } from "@/lib/content/admin-content";
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
    title: "Videos — CoinJecko Finance Hub",
    description: "Media administration.",
    noIndex: true,
  });
}

export default async function AdminVideosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect(`/${safeLocale}/admin`);

  const allowed = hasPermission(user.role, "media.manage_video");
  const videos = allowed ? await listVideos() : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Videos</h1>
        {allowed ? (
          <Link
            href={`/${safeLocale}/admin/videos/new`}
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-strong"
          >
            Add video
          </Link>
        ) : null}
      </div>

      {!allowed ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          Managing videos needs the media.manage_video permission, which your
          role does not hold.
        </p>
      ) : videos === null ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          The media backend is not reachable, so no videos can be listed.
          Configure Supabase and apply the migrations in
          <span className="font-latin"> supabase/migrations/</span>.
        </p>
      ) : videos.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          No videos yet. Add one and it appears on the public vlog page once
          you mark it published.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {videos.map((video) => (
            <li
              key={video.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <h2 className="font-medium">{video.title}</h2>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-muted">
                  <span className="font-latin">/{video.slug}</span>
                  <span className="font-latin uppercase">{video.locale}</span>
                  <span className="font-latin">
                    {video.provider || "no source"}
                  </span>
                  {video.isShort ? <span>short</span> : null}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border border-border px-2 py-0.5 text-xs font-semibold ${
                    video.status === "published" ? "text-up" : "text-ink-muted"
                  }`}
                >
                  {video.status}
                </span>
                <Link
                  href={`/${safeLocale}/admin/videos/${video.id}`}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-raised"
                >
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
