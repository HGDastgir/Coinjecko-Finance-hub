import type { Metadata } from "next";
import Link from "next/link";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, serializeJsonLd } from "@/lib/seo/json-ld";
import { publicEnv } from "@/lib/env";
import { getPublishedVideos } from "@/lib/content/public-content";
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
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  return buildPageMetadata({
    locale: safeLocale,
    path: "/vlogs",
    title: `${dict.vlogs.title} — ${dict.site.name}`,
    description: dict.vlogs.lead,
  });
}

export default async function VlogsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(safeLocale);
  const v = dict.vlogs;
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const videos = await getPublishedVideos(safeLocale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbSchema([
              { name: dict.site.name, url: `${base}/${safeLocale}` },
              { name: v.title, url: `${base}/${safeLocale}/vlogs` },
            ]),
          ),
        }}
      />
      <h1 className="text-3xl font-bold sm:text-4xl">{v.title}</h1>
      <span
        aria-hidden="true"
        className="mt-3 block h-1 w-16 rounded-full bg-sect-vlogs"
      />
      <p className="mt-4 max-w-2xl text-ink-muted">{v.lead}</p>

      <div className="mt-6">
        <StaffEditBar
          locale={safeLocale}
          editPath="/admin/videos/new"
          label={v.staffNew}
        />
      </div>

      <AdSlot
        placement="top-leaderboard"
        label={dict.ads.label}
        locale={safeLocale}
        path="/vlogs"
      />

      {videos === null ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface p-4 text-sm leading-relaxed text-ink-muted">
          {v.gate}
        </p>
      ) : videos.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface p-4 text-sm leading-relaxed text-ink-muted">
          {v.empty}
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => {
            const date = formatPublishedDate(video.publishedAt, safeLocale);
            const duration = formatDuration(video.durationSeconds);
            return (
              <li key={video.id}>
                <Link
                  href={`/${safeLocale}/vlogs/${video.slug}`}
                  className="block h-full rounded-lg border border-border bg-surface p-5 hover:border-brand"
                >
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                    {video.isShort ? (
                      <span className="rounded-full border border-border px-2 py-0.5">
                        {v.shortLabel}
                      </span>
                    ) : null}
                    {duration ? (
                      <span className="font-latin">
                        {v.duration} {duration}
                      </span>
                    ) : null}
                    {date ? (
                      <time dateTime={toDateAttribute(video.publishedAt)}>
                        {date}
                      </time>
                    ) : null}
                  </span>
                  <span className="mt-2 block font-semibold">
                    {video.title}
                  </span>
                  {video.description ? (
                    <span className="mt-2 block text-sm leading-relaxed text-ink-muted">
                      {video.description}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-10 text-xs text-ink-muted">{dict.data.notAdvice}</p>
    </div>
  );
}
