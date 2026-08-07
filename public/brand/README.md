# Brand assets

Save the CoinJecko logo here as **`coinjecko-logo.svg`** (preferred) or
`coinjecko-logo.png` / `.webp` / `.jpg`.

The header picks it up automatically on the next build — no code change.
While no file is present the header falls back to the text wordmark
rather than showing a broken image.

Notes:
- It renders at 36x36 in the header, so use a square crop of the mark
  (the gecko/coin symbol), not the full wide banner. A wide banner
  squeezed into a square reads as an unreadable smudge at that size.
- Keep the full banner separately if you want it for social cards
  (Open Graph), which is a different size and a different job.
