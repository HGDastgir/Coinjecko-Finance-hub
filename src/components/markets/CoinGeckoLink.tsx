import { coinGeckoCoinUrl } from "@/lib/markets/coingecko";

/**
 * Link out to a coin's CoinGecko page.
 *
 * Our own pages carry editorial context and a cached quote; CoinGecko
 * carries the live rate, order-book depth and full history we do not
 * license. Sending a reader there is the honest completion of a page
 * that shows a minute-old price.
 *
 * Renders nothing when the slug does not resolve to a valid coin id,
 * rather than emitting a link that 404s on someone else's site.
 */
export function CoinGeckoLink({
  slug,
  label,
  className = "",
}: {
  slug: string;
  /** Localised, e.g. dict.assets.liveOnCoinGecko. */
  label: string;
  className?: string;
}) {
  const href = coinGeckoCoinUrl(slug);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener noreferrer"
      className={`block text-xs text-ink-muted underline decoration-dotted underline-offset-2 hover:text-brand ${className}`}
    >
      {label} ↗
    </a>
  );
}
