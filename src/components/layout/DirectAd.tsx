import Image from "next/image";
import { publicEnv } from "@/lib/env";
import { resolveImageSrc } from "@/lib/content/media";
import type { LiveAd } from "@/lib/content/ads";

/**
 * The creative for a campaign we sold directly.
 *
 * THE LINK, and why it carries what it carries:
 *
 * `rel="sponsored"` is Google's required annotation for a paid link;
 * without it the placement is an undisclosed paid link, which is both
 * a search-guidelines violation and dishonest. `noopener` severs the
 * advertiser's page from ours — an ad destination is a third party we
 * do not control, and window.opener would hand it a handle to
 * navigate the tab it came from. `noreferrer` keeps the reader's
 * current article path out of the advertiser's logs; an advertiser
 * buys attention, not a record of what each reader was reading.
 *
 * The href is re-checked here even though the database CHECK
 * constraint and the save action both already refused anything but
 * https. This is the point where the value becomes an href, and a
 * guard at that point costs nothing.
 *
 * Image creatives are served from our own storage bucket — never a
 * third-party URL — so the img-src CSP does not have to widen for
 * every advertiser, and the advertiser cannot swap the creative after
 * approval or count impressions from our readers by hosting it
 * themselves.
 */
export function DirectAd({ ad }: { ad: LiveAd }) {
  const href =
    ad.targetUrl && /^https:\/\//i.test(ad.targetUrl) ? ad.targetUrl : null;
  const imageSrc = resolveImageSrc(
    ad.imagePath,
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  );

  const body = imageSrc ? (
    <Image
      src={imageSrc}
      // The booked alt text describes the creative. Never the campaign
      // name — that is an internal label ("Q3 Meezan retainer"), not
      // something a reader should hear.
      alt={ad.imageAlt ?? ""}
      width={970}
      height={250}
      sizes="(max-width: 768px) 100vw, 970px"
      className="h-auto max-h-full w-auto max-w-full object-contain"
    />
  ) : (
    // Text fallback: a campaign booked before its artwork arrives still
    // renders something the advertiser can check, rather than an empty
    // box that looks like a bug.
    <span className="px-4 py-2 text-center text-sm font-medium text-ink">
      {ad.name}
    </span>
  );

  if (!href) return body;

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="flex h-full w-full items-center justify-center"
    >
      {body}
    </a>
  );
}
