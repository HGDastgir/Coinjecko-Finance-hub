import Image from "next/image";
import Link from "next/link";
import { brandBanner } from "@/content/brand";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { PosterTilt } from "./PosterTilt";

/**
 * The marketing banner as a full-bleed header band.
 *
 * Resolved from disk like the logo, so the header degrades to its
 * ordinary compact form when no banner file is present rather than
 * reserving space for a broken image.
 *
 * Two copies of one file, which is the point of the layout:
 *
 * 1. A blurred, dimmed copy at object-cover fills the band edge to
 *    edge. Cropping does not matter here — it is out of focus and
 *    carries no information.
 * 2. The sharp copy sits on top at object-contain, so the whole
 *    artwork stays visible and uncropped.
 *
 * The alternative — one full-bleed copy at object-cover — would crop a
 * 1.9:1 banner into a ~6:1 slot and cut the gecko, the icon row and
 * most of the composition. Contain alone would leave dead canvas
 * either side of the artwork. This gives full-width coverage AND the
 * complete image.
 *
 * BANNER_RATIO matches the current artwork; update it if the file is
 * replaced with a different shape.
 */
const BANNER_RATIO = "aspect-[640/336]";

export function HeaderPoster({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const banner = brandBanner();
  if (!banner) return null;

  return (
    <div className="relative isolate overflow-hidden border-b border-border">
      {/* Out-of-focus backdrop. Scaled past the edges so the blur
          radius cannot pull the canvas in as a vignette. */}
      <Image
        src={banner.src}
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="scale-125 object-cover opacity-40 blur-2xl"
      />
      {/* Scrim: holds contrast under the artwork and blends the band
          into the header rows below it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-canvas/70 via-canvas/40 to-canvas"
      />

      <div className="poster-stage relative mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Link
          href={`/${locale}`}
          aria-label={`${dict.site.name} — ${dict.site.tagline}`}
          className="mx-auto block w-full max-w-3xl"
        >
          <PosterTilt>
            <div className={`relative w-full ${BANNER_RATIO}`}>
              <Image
                src={banner.src}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-contain"
              />
            </div>
          </PosterTilt>
        </Link>
      </div>
    </div>
  );
}
