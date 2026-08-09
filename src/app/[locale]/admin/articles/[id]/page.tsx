import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { canEdit } from "@/lib/content/workflow";
import { getEditableArticle } from "@/lib/content/admin-content";
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
    path: "/admin/articles",
    title: "Edit article — CoinJecko Finance Hub",
    description: "Editorial administration.",
    noIndex: true,
  });
}

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const user = await getCurrentUser();
  if (!user || !user.isActive) redirect(`/${safeLocale}/admin`);

  const article = await getEditableArticle(id);
  const editable =
    article !== null && canEdit(user.role, article.createdBy === user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href={`/${safeLocale}/admin`}
        className="text-sm text-ink-muted hover:text-brand"
      >
        ← Admin
      </Link>

      {article === null ? (
        <>
          <h1 className="mt-3 text-2xl font-semibold">Article unavailable</h1>
          <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
            This article does not exist, or the content backend is not
            reachable. Nothing is shown rather than an empty form that would
            overwrite it.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-3 text-2xl font-semibold">
            {article.translations.en?.title ??
              article.translations.ur?.title ??
              "Untitled article"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Status <span className="font-latin">{article.status}</span> — the
            queue on the overview has the full set of workflow moves.
          </p>

          {!editable ? (
            <p className="mt-6 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">
              You have no edit rights on this article, so it is not shown for
              editing.
            </p>
          ) : (
            <ArticleEditor
              locale={safeLocale}
              article={article}
              canPublish={hasPermission(user.role, "content.publish")}
            />
          )}
        </>
      )}
    </div>
  );
}
