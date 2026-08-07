import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { buildPageMetadata } from "@/lib/seo/metadata";

/**
 * Admin shell (Phase 9 builds the full CMS here). Defence in depth:
 * the request proxy already redirects unauthenticated visitors, and
 * this server component re-checks the session + active flag before
 * rendering anything.
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
      <p className="mt-6 text-sm text-ink-muted">
        The editorial CMS (content workflow, market data, adverts,
        newsletter) arrives in Phase 9. Access is already role-gated and
        audit-logged.
      </p>
    </div>
  );
}
