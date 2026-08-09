import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Brand logo detection.
 *
 * The logo is looked up on disk at build time rather than hard-coded,
 * so the header degrades to the text wordmark when no file is present
 * instead of shipping a broken-image icon. Drop a file at one of the
 * paths below and it appears on the next build — no code change.
 *
 * Order matters: SVG first because it stays crisp at any size, then
 * raster formats.
 */

const CANDIDATES = [
  "brand/coinjecko-logo.svg",
  "brand/coinjecko-logo.png",
  "brand/coinjecko-logo.webp",
  "brand/coinjecko-logo.jpg",
] as const;

/**
 * The wide marketing banner, used as the header poster. Raster first
 * here: the banner is photographic artwork, so webp/png is what it
 * will realistically be — unlike the mark, which benefits from SVG.
 */
const BANNER_CANDIDATES = [
  "brand/coinjecko-banner.webp",
  "brand/coinjecko-banner.png",
  "brand/coinjecko-banner.jpg",
  "brand/coinjecko-banner.svg",
] as const;

export interface BrandAsset {
  /** Public URL path, e.g. /brand/coinjecko-logo.png */
  src: string;
}

/** Kept as its own name for the existing header import. */
export type BrandLogo = BrandAsset;

function firstOnDisk(candidates: readonly string[]): BrandAsset | null {
  for (const relative of candidates) {
    const onDisk = path.join(process.cwd(), "public", relative);
    if (existsSync(onDisk)) return { src: `/${relative}` };
  }
  return null;
}

export function brandLogo(): BrandAsset | null {
  return firstOnDisk(CANDIDATES);
}

export function brandBanner(): BrandAsset | null {
  return firstOnDisk(BANNER_CANDIDATES);
}
