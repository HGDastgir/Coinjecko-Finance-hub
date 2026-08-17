import Link from "next/link";
import { signOutAction } from "@/lib/auth/actions";
import type { Locale } from "@/i18n/config";

/**
 * Admin section nav. Links are only rendered for permissions the user
 * actually holds — a convenience, not a control: every target
 * re-checks server-side and the database refuses the rest.
 *
 * Sign-out is a form rather than a link because it changes state.
 * A GET link would let any page on the internet sign a staff member
 * out with an <img src>, and browsers would happily prefetch it.
 */
export function AdminNav({
  locale,
  canEditContent,
  canManageVideos,
  canManageAds,
  canReadMessages,
  unreadMessages = 0,
  signedInAs,
}: {
  locale: Locale;
  canEditContent: boolean;
  canManageVideos: boolean;
  canManageAds: boolean;
  canReadMessages: boolean;
  /** Unread contact messages, shown as a badge on the Messages tab. */
  unreadMessages?: number;
  /** Email or id of the current user, shown so the account is obvious. */
  signedInAs?: string | null;
}) {
  const items = [
    { href: `/${locale}/admin`, label: "Overview", show: true, badge: 0 },
    {
      href: `/${locale}/admin/articles/new`,
      label: "New article",
      show: canEditContent,
      badge: 0,
    },
    {
      href: `/${locale}/admin/videos`,
      label: "Videos",
      show: canManageVideos,
      badge: 0,
    },
    {
      href: `/${locale}/admin/ads`,
      label: "Advertising",
      show: canManageAds,
      badge: 0,
    },
    {
      href: `/${locale}/admin/messages`,
      label: "Messages",
      show: canReadMessages,
      badge: unreadMessages,
    },
  ].filter((item) => item.show);

  return (
    <div className="border-b border-border">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-2">
        <nav aria-label="Admin sections" className="me-auto">
          <ul className="flex flex-wrap gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-raised"
                >
                  {item.label}
                  {item.badge > 0 ? (
                    // Not colour alone: the count itself is the signal,
                    // and the label spells out what it counts for a
                    // screen reader rather than reading "Messages 3".
                    <span className="rounded-full bg-brand px-1.5 py-0.5 font-latin text-xs font-semibold text-brand-contrast">
                      {item.badge}
                      <span className="sr-only"> awaiting reply</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/${locale}`}
                className="block rounded-md px-3 py-2 text-sm text-ink-muted hover:bg-surface-raised"
              >
                View site ↗
              </Link>
            </li>
          </ul>
        </nav>

        {signedInAs ? (
          <span className="font-latin text-xs text-ink-muted">
            {signedInAs}
          </span>
        ) : null}

        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-raised"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
