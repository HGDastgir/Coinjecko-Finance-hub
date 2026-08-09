import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getBreakingNews } from "@/lib/content/public-content";
import { formatPublishedDate, toDateAttribute } from "@/lib/content/format";

/**
 * Breaking-news strip in the site header.
 *
 * Renders nothing at all when the backend is absent or nothing is
 * published — an empty "Breaking" bar would imply a newsroom that is
 * running when it is not. No marquee: the crypto ticker above it
 * already moves, and a second animated band is a readability and
 * vestibular-comfort problem. The strip scrolls on overflow instead.
 *
 * Breaking news is `articles` with article_type = 'breaking_news', so
 * an item's link is its ordinary article URL.
 */
export async function BreakingNewsBar({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const items = await getBreakingNews(locale, 5);
  if (!items || items.length === 0) return null;

  return (
    <aside
      aria-label={dict.breaking.ariaLabel}
      className="border-b border-border bg-surface-raised"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <span className="shrink-0 rounded-md bg-accent px-2 py-1 text-xs font-bold uppercase tracking-wide text-brand-contrast">
          {dict.breaking.label}
        </span>
        <ul className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto text-sm">
          {items.map((item) => {
            const date = formatPublishedDate(item.publishedAt, locale);
            return (
              <li key={item.id} className="shrink-0">
                <Link
                  href={`/${locale}/blog/${item.slug}`}
                  className="hover:text-brand"
                >
                  {item.title}
                </Link>
                {date ? (
                  <time
                    dateTime={toDateAttribute(item.publishedAt)}
                    className="ms-2 font-latin text-xs text-ink-muted"
                  >
                    {date}
                  </time>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
