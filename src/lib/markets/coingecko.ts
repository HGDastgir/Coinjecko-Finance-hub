/**
 * Mapping our coin slugs to CoinGecko's, and building links to their
 * coin pages.
 *
 * Free of `server-only` on purpose: the market table is a client
 * component and needs the same mapping the server fetch uses. One
 * table, imported by both, so a slug can never mean two different
 * coins depending on which side of the wire you are on.
 */

/**
 * Site slug → CoinGecko id. They differ for XRP and BNB, whose
 * provider ids are historical ("ripple", "binancecoin").
 *
 * Only the curated coins need an entry. Everything else in the market
 * table is already keyed by the provider's own id, so it maps to
 * itself — see coinGeckoId().
 */
export const COINGECKO_IDS: Record<string, string> = {
  bitcoin: "bitcoin",
  ethereum: "ethereum",
  tether: "tether",
  xrp: "ripple",
  bnb: "binancecoin",
  solana: "solana",
  cardano: "cardano",
};

/** Reverse lookup, for turning a provider row back into our slug. */
export const SLUG_BY_COINGECKO_ID = new Map(
  Object.entries(COINGECKO_IDS).map(([slug, id]) => [id, slug]),
);

export function coinGeckoId(slug: string): string {
  return COINGECKO_IDS[slug] ?? slug;
}

/**
 * The coin's page on CoinGecko, where a reader gets live rates,
 * depth and history we do not license.
 *
 * The id is checked against the character set CoinGecko actually
 * uses before it is interpolated. Slugs reaching here can originate
 * in an upstream API response, and an unchecked value would be a way
 * to point a link somewhere else entirely.
 */
export function coinGeckoCoinUrl(slug: string): string | null {
  const id = coinGeckoId(slug);
  if (!/^[a-z0-9][a-z0-9-]{0,64}$/.test(id)) return null;
  return `https://www.coingecko.com/en/coins/${id}`;
}
