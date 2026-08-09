import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { getBreakingNews } from "@/lib/content/public-content";

/**
 * Breaking-news strip: the first thing on the page, above everything.
 *
 * Renders nothing at all when the backend is absent or nothing is
 * published — an empty "BREAKING NEWS" bar would imply a newsroom that
 * is running when it is not.
 *
 * The marquee reuses the .ticker mechanics from globals.css, which
 * already handle hover/focus pause, RTL direction, and — importantly —
 * prefers-reduced-motion, where the animation is dropped entirely and
 * the strip becomes a plain horizontally scrollable list. Two animated
 * bands stacked at the top of a page is a lot of movement; anyone who
 * has asked their system to stop it gets a still, readable strip.
 *
 * The headline list is rendered TWICE. The track translates by -50%,
 * so the second copy is exactly where the first started when the
 * animation loops — that is what makes the scroll seamless rather than
 * jumping back at the end. The duplicate is aria-hidden so a screen
 * reader hears each headline once.
 */
export async function BreakingNewsBar({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const items = await getBreakingNews(locale, 8);
  if (!items || items.length === 0) return null;

  const headlines = (
    <>
      {items.map((item) => (
        <span key={item.id} className="flex items-center">
          <Link
            href={`/${locale}/blog/${item.slug}`}
            className="whitespace-nowrap px-4 py-2 text-sm text-ink hover:text-brand"
          >
            {item.title}
          </Link>
          {/* Decorative separator: the gap between links already
              conveys the boundary to a screen reader. */}
          <span aria-hidden="true" className="text-border">
            |
          </span>
        </span>
      ))}
    </>
  );

  return (
    <aside
      aria-label={dict.breaking.ariaLabel}
      className="border-b border-border bg-surface-raised"
    >
      <div className="flex items-stretch">
        <span className="flex shrink-0 items-center gap-2 bg-down px-3 py-2 text-xs font-bold uppercase tracking-wide text-white sm:px-4">
          {/* The dot keeps the label legible as "live" without relying
              on the red alone, which colour-blind readers may not
              distinguish from the surrounding dark surface. */}
          <span aria-hidden="true" className="text-[0.6rem]">
            ●
          </span>
          <span className="whitespace-nowrap">{dict.breaking.label}</span>
        </span>

        <div className="ticker ticker-breaking min-w-0 flex-1">
          <div className="ticker-track">
            <span className="ticker-group">{headlines}</span>
            <span className="ticker-group" data-copy="1" aria-hidden="true">
              {headlines}
            </span>
          </div>
        </div>

        <Link
          href={`/${locale}/breaking-news`}
          className="hidden shrink-0 items-center px-3 text-xs text-ink-muted hover:text-brand sm:flex"
        >
          {dict.breaking.seeAll} →
        </Link>
      </div>
    </aside>
  );
}
