import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { AdminNav } from "@/components/admin/AdminNav";
import { countUnhandledMessages } from "@/lib/content/contact-inbox";

/**
 * Admin shell. Defence in depth: the request proxy already redirects
 * unauthenticated visitors, and this layout re-checks the session and
 * the active flag before any admin page renders. Every page below it
 * re-checks its own permission again — a layout gate alone is not an
 * authorisation model.
 */

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : defaultLocale;

  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    redirect(
      `/${safeLocale}/sign-in?next=${encodeURIComponent(`/${safeLocale}/admin`)}`,
    );
  }

  // Only queried for roles that could read the inbox anyway — no point
  // counting rows the database would refuse to return.
  const canReadMessages = hasPermission(user.role, "users.manage");
  const unreadMessages = canReadMessages ? await countUnhandledMessages() : 0;

  return (
    <div>
      <AdminNav
        locale={safeLocale}
        canEditContent={hasPermission(user.role, "content.create")}
        canManageVideos={hasPermission(user.role, "media.manage_video")}
        canReadMessages={canReadMessages}
        unreadMessages={unreadMessages}
        signedInAs={user.email ?? user.displayName}
      />
      {children}
    </div>
  );
}
