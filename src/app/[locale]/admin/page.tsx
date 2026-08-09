import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getEditorialQueue } from "@/lib/content/articles";
import { EditorialQueue } from "@/components/admin/EditorialQueue";
import { buildPageMetadata } from "@/lib/seo/metadata";

/**
 * Admin shell. Defence in depth: the request proxy already redirects
 * unauthenticated visitors, and this server component re-checks the
 * session + active flag before rendering anything.
 */

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
    path: "/admin",
    title: "Admin — CoinJecko Finance Hub",
    description: "Editorial administration.",
    noIndex: true,
  });
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    redirect(`/${safeLocale}/sign-in?next=${encodeURIComponent(`/${safeLocale}/admin`)}`);
  }

  const canSeeQueue =
    hasPermission(user.role, "content.review") ||
    hasPermission(user.role, "content.create");
  const articles = canSeeQueue ? await getEditorialQueue() : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <dl className="mt-6 space-y-2 rounded-lg border border-border bg-surface p-5 text-sm">
        <div className="flex gap-2">
          <dt className="font-medium">Signed in as</dt>
          <dd className="font-latin">{user.email ?? user.id}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium">Role</dt>
          <dd className="font-latin">{user.role ?? "none assigned"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {hasPermission(user.role, "content.create") ? (
          <Link
            href={`/${safeLocale}/admin/articles/new`}
            className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-strong"
          >
            New article
          </Link>
        ) : null}
        {hasPermission(user.role, "media.manage_video") ? (
          <Link
            href={`/${safeLocale}/admin/videos`}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-surface-raised"
          >
            Manage videos
          </Link>
        ) : null}
      </div>

      {!canSeeQueue ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          Your role has no editorial permissions, so no content queue is
          shown here.
        </p>
      ) : articles === null ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          The content backend is not reachable, so the editorial queue is
          unavailable. Configure Supabase and apply the migrations in
          <span className="font-latin"> supabase/migrations/</span> to enable
          it.
        </p>
      ) : (
        <EditorialQueue
          articles={articles}
          role={user.role}
          userId={user.id}
          locale={safeLocale}
        />
      )}

      <p className="mt-8 text-sm text-ink-muted">
        Articles and vlog episodes are editable here. Adverts and newsletter
        management arrive later in Phase 9. Every action is role-gated and
        audit-logged.
      </p>
    </div>
  );
}
