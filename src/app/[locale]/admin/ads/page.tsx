import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { listAds } from "@/lib/content/admin-ads";
import { describeScope, isWithinFlight } from "@/content/ad-targeting";
import { isAdPlacement } from "@/content/ad-placements";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { AdRowActions } from "@/components/admin/AdRowActions";

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
    title: "Advertising — CoinJecko Finance Hub",
    description: "Campaign administration.",
    noIndex: true,
  });
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return `${new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(parsed)} UTC`;
}

export default async function AdminAdsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect(`/${safeLocale}/admin`);

  const allowed = hasPermission(user.role, "ads.manage");
  const ads = allowed ? await listAds() : null;
  const now = new Date();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Advertising</h1>
        {allowed ? (
          <Link
            href={`/${safeLocale}/admin/ads/new`}
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-strong"
          >
            Book campaign
          </Link>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-ink-muted">
        Campaigns you have sold directly. Publishing one puts it live across
        every page it targets; pausing removes it everywhere within seconds.
      </p>

      {!allowed ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          Managing advertising needs the ads.manage permission, which your
          role does not hold.
        </p>
      ) : ads === null ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          The advertising backend is not reachable, so no campaigns can be
          listed. Check Supabase, and that
          <span className="font-latin"> supabase/migrations/0011</span> has
          been applied.
        </p>
      ) : ads.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          No campaigns booked. Create one and choose “Every page” to run it
          across the whole site, or narrow it to a single section.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {ads.map((ad) => {
            // Live and scheduled are different states and the list says
            // so: a campaign marked live but outside its flight window
            // renders nothing, and an operator staring at a green badge
            // wondering why the ad is missing is exactly the confusion
            // worth spending a word to prevent.
            const scheduled =
              ad.isActive &&
              !isWithinFlight(
                {
                  placement: "top-leaderboard",
                  locale: ad.locale,
                  pageScope: ad.pageScope,
                  priority: ad.priority,
                  startsAt: ad.startsAt,
                  endsAt: ad.endsAt,
                },
                now,
              );
            const unknownPlacement = !isAdPlacement(ad.placement);

            return (
              <li
                key={ad.id}
                className={`rounded-lg border bg-surface p-4 ${
                  ad.isActive && !scheduled
                    ? "border-brand/40"
                    : "border-border opacity-80"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium">{ad.name}</h2>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span className="font-latin">{ad.placement}</span>
                      <span>{describeScope(ad.pageScope)}</span>
                      <span className="font-latin uppercase">
                        {ad.locale ?? "en + ur"}
                      </span>
                      <span className="font-latin">{ad.kind}</span>
                      {ad.priority > 0 ? (
                        <span className="font-latin">p{ad.priority}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      <span className="font-latin">
                        {formatWhen(ad.startsAt)} → {formatWhen(ad.endsAt)}
                      </span>
                    </p>
                    {ad.targetUrl ? (
                      <p className="mt-1 break-all font-latin text-xs text-ink-muted">
                        {ad.targetUrl}
                      </p>
                    ) : null}
                    {unknownPlacement ? (
                      <p className="mt-1 text-xs text-down">
                        This placement is not one the site renders, so the
                        campaign will never appear. Edit it and choose
                        another.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full border border-border px-2 py-0.5 text-xs font-semibold ${
                        ad.isActive && !scheduled
                          ? "text-up"
                          : "text-ink-muted"
                      }`}
                    >
                      {!ad.isActive
                        ? "paused"
                        : scheduled
                          ? "outside flight"
                          : "live"}
                    </span>
                    <Link
                      href={`/${safeLocale}/admin/ads/${ad.id}`}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-raised"
                    >
                      Edit
                    </Link>
                  </div>
                </div>

                <div className="mt-3">
                  <AdRowActions
                    adId={ad.id}
                    name={ad.name}
                    isActive={ad.isActive}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
