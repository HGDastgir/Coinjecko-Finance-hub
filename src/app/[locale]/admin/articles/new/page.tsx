import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
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
    path: "/admin/articles/new",
    title: "New article — CoinJecko Finance Hub",
    description: "Editorial administration.",
    noIndex: true,
  });
}

export default async function NewArticlePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect(`/${safeLocale}/admin`);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href={`/${safeLocale}/admin`}
        className="text-sm text-ink-muted hover:text-brand"
      >
        ← Admin
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">New article</h1>

      {!hasPermission(user.role, "content.create") ? (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
          Your role cannot create articles.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-muted">
            Write it, then either save a draft or publish straight away —
            the same workflow rules apply to both.
          </p>
          <ArticleEditor
            locale={safeLocale}
            article={null}
            canPublish={hasPermission(user.role, "content.publish")}
          />
        </>
      )}
    </div>
  );
}
