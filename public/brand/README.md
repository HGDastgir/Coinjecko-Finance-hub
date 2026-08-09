# Brand assets

Two separate files, two separate jobs. Both are detected on disk by
`src/content/brand.ts` — drop a file in and it appears on the next
build, no code change. While a file is absent the header degrades
gracefully rather than showing a broken image.

## 1. The mark — `coinjecko-logo.svg`

Preferred: `coinjecko-logo.svg`. Also accepted: `.png`, `.webp`, `.jpg`.

Renders at 36x36 beside the wordmark, so use a **square crop of the
symbol** (the gecko/coin mark), not the wide banner. A wide banner
squeezed into a square reads as an unreadable smudge at that size.
Without it, the header shows the text wordmark alone.

## 2. The poster — `coinjecko-banner.webp`

Preferred: `coinjecko-banner.webp`. Also accepted: `.png`, `.jpg`,
`.svg`.

The full-width marketing banner ("COINJECKO MARKETS — Real-time crypto,
finance & global market intelligence"). It renders at the top of the
header as a 3D poster: perspective, resting tilt, depth shadow, sheen,
and a live tilt that follows a mouse pointer. Without it, the header
starts at the compact wordmark row as before.

Currently installed: `coinjecko-banner.jpg`, 640x336 (51 KB).

Notes:
- **Re-export at ~1400px wide when you can.** The poster renders 448
  CSS px wide, which is 896 device px on a 2x screen — the current
  640px source is upscaled there and looks soft. Same artwork, same
  ratio, just a larger export.
- The frame is sized by width at the artwork's aspect ratio, set by
  `POSTER_RATIO` in `src/components/layout/HeaderPoster.tsx`. A
  replacement with a different shape still renders whole, but update
  that constant or it will sit letterboxed inside the frame.
- The artwork already carries the site name, so the `<img>` is
  `alt=""` and the surrounding link has the accessible name. Do not
  add text that only exists inside the image.
