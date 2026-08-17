import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  serializeJsonLd,
  videoObjectSchema,
} from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import { getVideoBySlug } from "@/lib/content/public-content";
import {
  resolveUploadedVideo,
  resolveVideoSource,
} from "@/lib/content/video-embed";
import { resolveImageSrc } from "@/lib/content/media";
import {
  formatDuration,
  formatPublishedDate,
  toDateAttribute,
} from "@/lib/content/format";
import { AdSlot } from "@/components/layout/AdSlot";
import { StaffEditBar } from "@/components/layout/StaffEditBar";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const video = await getVideoBySlug(safeLocale, slug);

  if (!video) {
    return buildPageMetadata({
      locale: safeLocale,
      path: `/vlogs/${slug}`,
      title: `${dict.notFound.title} — ${dict.site.name}`,
      description: dict.notFound.description,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    locale: safeLocale,
    path: `/vlogs/${video.slug}`,
    title: `${video.title} — ${dict.site.name}`,
    description: video.description ?? dict.vlogs.lead,
  });
}

export default async function VlogPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const v = dict.vlogs;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;

  const video = await getVideoBySlug(safeLocale, slug);
  if (!video) notFound();

  const url = `${base}/${safeLocale}/vlogs/${video.slug}`;
  // An uploaded file resolves from its storage key; the other two
  // sources keep the path they always had.
  const source =
    video.provider === "upload"
      ? resolveUploadedVideo(video.storagePath, publicEnv.NEXT_PUBLIC_SUPABASE_URL)
      : resolveVideoSource(video.provider, video.providerRef);
  const poster = resolveImageSrc(
    video.posterPath,
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  );
  const date = formatPublishedDate(video.publishedAt, safeLocale);
  const duration = formatDuration(video.durationSeconds);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              { name: v.title, url: `${base}/${safeLocale}/vlogs` },
              { name: video.title, url },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            videoObjectSchema({
              url,
              name: video.title,
              description: video.description,
              uploadDate: toDateAttribute(video.publishedAt),
              durationSeconds: video.durationSeconds,
              embedUrl: source?.kind === "youtube" ? source.embedUrl : null,
            }),
          ),
        }}
      />

      <StaffEditBar
        locale={safeLocale}
        editPath={`/admin/videos/${video.id}`}
        label={dict.vlogs.staffEditing}
      />

      <Link
        href={`/${safeLocale}/vlogs`}
        className="text-sm text-ink-muted hover:text-brand"
      >
        ← {v.backToVlogs}
      </Link>

      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{video.title}</h1>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        {date ? (
          <time dateTime={toDateAttribute(video.publishedAt)}>
            {v.publishedOn} {date}
          </time>
        ) : null}
        {duration ? (
          <span className="font-latin">
            {v.duration} {duration}
          </span>
        ) : null}
        {video.isShort ? <span>{v.shortLabel}</span> : null}
      </p>

      <div className="mt-6">
        {source === null ? (
          <p className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
            {v.playerUnavailable}
          </p>
        ) : source.kind === "youtube" ? (
          <>
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
              <iframe
                src={source.embedUrl}
                title={video.title}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-full w-full"
              />
            </div>
            <p className="mt-2 text-xs text-ink-muted">{v.privacyNote}</p>
          </>
        ) : (
          // Native controls give play/pause, volume, scrubbing,
          // fullscreen and picture-in-picture on every platform,
          // including mobile, for free — and they stay accessible and
          // keyboard-operable without us reimplementing any of it.
          //
          // playsInline stops iOS hijacking playback into its
          // fullscreen player, which is what makes the video behave
          // like part of the page on a phone.
          //
          // preload="metadata" fetches only enough to show duration
          // and the first frame: a 200 MB file must not be pulled down
          // by anyone who merely opens the page.
          //
          // Captions are attached per episode once the media pipeline
          // ships; the element carries no <track> yet rather than an
          // empty one that would claim captions exist.
          <video
            src={source.src}
            poster={poster ?? undefined}
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"
            className="aspect-video w-full rounded-lg border border-border bg-black"
          >
            {v.playerUnavailable}
          </video>
        )}
      </div>

      <AdSlot
        placement="below-player"
        label={dict.ads.label}
        locale={safeLocale}
        path={`/vlogs/${video.slug}`}
      />

      {video.description ? (
        <p className="mt-6 leading-relaxed">{video.description}</p>
      ) : null}

      <p className="mt-10 text-xs text-ink-muted">{dict.data.notAdvice}</p>
    </div>
  );
}
