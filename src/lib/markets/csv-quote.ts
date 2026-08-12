/**
 * Parsing a price out of a third-party CSV feed.
 *
 * Deliberately free of `server-only` and of any import: it is pure
 * string handling, which is what lets the test suite cover it. The
 * fetching around it lives in commodity-prices.ts, which cannot be
 * imported outside a server context.
 */

/**
 * The newest usable `YYYY-MM-DD,price` row.
 *
 * Read from the end because these files run from the 1980s to now and
 * only the latest row matters. Every row is validated rather than
 * trusted — this is text from a source we do not control, and it ends
 * up rendered as a price on a finance page.
 *
 * A zero or negative value is refused. Negative oil settlements are
 * real (April 2020), which is exactly why one must never appear as a
 * current quote off the back of a malformed line.
 */
export function lastCsvQuote(
  csv: string,
): { price: number; date: string } | null {
  const lines = csv.trim().split(/\r?\n/);

  // Start at the last line; stop before index 0, which is the header.
  for (let i = lines.length - 1; i >= 1; i--) {
    const match = /^(\d{4}-\d{2}-\d{2}),(-?\d+(?:\.\d+)?)$/.exec(
      lines[i].trim(),
    );
    if (!match) continue;

    const price = Number(match[2]);
    if (!Number.isFinite(price) || price <= 0) continue;

    return { price, date: match[1] };
  }

  return null;
}
