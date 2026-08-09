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
  signedInAs,
}: {
  locale: Locale;
  canEditContent: boolean;
  canManageVideos: boolean;
  /** Email or id of the current user, shown so the account is obvious. */
  signedInAs?: string | null;
}) {
  const items = [
    { href: `/${locale}/admin`, label: "Overview", show: true },
    {
      href: `/${locale}/admin/articles/new`,
      label: "New article",
      show: canEditContent,
    },
    {
      href: `/${locale}/admin/videos`,
      label: "Videos",
      show: canManageVideos,
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
                  className="block rounded-md px-3 py-2 text-sm hover:bg-surface-raised"
                >
                  {item.label}
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
