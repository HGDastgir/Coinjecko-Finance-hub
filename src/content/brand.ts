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

export interface BrandLogo {
  /** Public URL path, e.g. /brand/coinjecko-logo.png */
  src: string;
}

export function brandLogo(): BrandLogo | null {
  for (const relative of CANDIDATES) {
    const onDisk = path.join(process.cwd(), "public", relative);
    if (existsSync(onDisk)) return { src: `/${relative}` };
  }
  return null;
}
