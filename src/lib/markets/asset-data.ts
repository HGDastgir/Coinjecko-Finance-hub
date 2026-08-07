/**
 * Reference data for crypto assets, forex pairs and commodities
 * (mirrors supabase/seed.sql). Same rules as reference-data.ts:
 * factual editorial copy, no price claims, quotes only ever come from
 * licensed providers. English is authoritative; Urdu follows review.
 */

export interface CryptoAssetInfo {
  symbol: string;
  slug: string;
  name: string;
  description: string;
  whyItMatters: string;
}

export const CRYPTO_ASSETS: CryptoAssetInfo[] = [
  {
    symbol: "BTC",
    slug: "bitcoin",
    name: "Bitcoin",
    description:
      "The first and largest cryptocurrency by market value, launched in 2009. Bitcoin runs on a proof-of-work blockchain with a fixed maximum supply of 21 million coins.",
    whyItMatters:
      "Bitcoin sets the tone for the entire crypto market and is increasingly held alongside traditional assets. Its price moves with global liquidity, US monetary policy and regulatory news — context our Crypto Context Report explains without hype.",
  },
  {
    symbol: "ETH",
    slug: "ethereum",
    name: "Ethereum",
    description:
      "The second-largest cryptocurrency and the leading smart-contract platform, hosting most decentralised finance and tokenised applications. Ethereum has used proof-of-stake consensus since 2022.",
    whyItMatters:
      "Ethereum is the infrastructure layer for much of the digital-asset economy; activity and fees on its network are a useful gauge of real usage beyond speculation.",
  },
  {
    symbol: "USDT",
    slug: "tether",
    name: "Tether (USDT)",
    description:
      "The largest US-dollar stablecoin, designed to hold a 1:1 value against the dollar and backed by reserves held by its issuer. Stablecoins act as the cash leg of most crypto trading.",
    whyItMatters:
      "In markets with currency pressure, dollar stablecoins are widely used as an informal dollar substitute — making USDT relevant to readers in Pakistan and other emerging markets, alongside its regulatory scrutiny.",
  },
  {
    symbol: "XRP",
    slug: "xrp",
    name: "XRP",
    description:
      "The native asset of the XRP Ledger, a blockchain focused on fast, low-cost payments and settlement between financial institutions.",
    whyItMatters:
      "XRP's story is tied to cross-border payments and to landmark regulatory cases that shape how digital assets are classified.",
  },
  {
    symbol: "BNB",
    slug: "bnb",
    name: "BNB",
    description:
      "The exchange token of the Binance ecosystem, used for trading-fee discounts and as the native asset of the BNB Chain network.",
    whyItMatters:
      "As the token of the largest crypto exchange group, BNB reflects the health of centralised crypto trading and its regulatory environment.",
  },
  {
    symbol: "SOL",
    slug: "solana",
    name: "Solana",
    description:
      "A high-throughput proof-of-stake blockchain designed for low-fee, high-speed transactions, popular for consumer apps and token trading.",
    whyItMatters:
      "Solana is the main challenger to Ethereum for on-chain activity; its usage trends signal where developers and retail users are moving.",
  },
  {
    symbol: "ADA",
    slug: "cardano",
    name: "Cardano",
    description:
      "A proof-of-stake blockchain developed with an academic, research-driven approach, with its ADA token used for staking and fees.",
    whyItMatters:
      "Cardano maintains one of the larger long-term holder communities and is a recurring reference point in debates over blockchain design.",
  },
];

export interface ForexPairInfo {
  base: string;
  quote: string;
  slug: string;
  description: string;
  whyItMatters: string;
  group: "pkr_corridor" | "major";
}

export const FOREX_PAIRS: ForexPairInfo[] = [
  {
    base: "USD",
    quote: "PKR",
    slug: "usd-pkr",
    group: "pkr_corridor",
    description:
      "The US dollar against the Pakistani rupee — Pakistan's most important exchange rate, set in the interbank market under the State Bank of Pakistan's managed float.",
    whyItMatters:
      "USD/PKR drives import prices, fuel costs, external-debt servicing and inflation in Pakistan, and is the anchor rate for remittances. It is the centrepiece of our Pakistan Rupee Watch series.",
  },
  {
    base: "EUR",
    quote: "PKR",
    slug: "eur-pkr",
    group: "pkr_corridor",
    description:
      "The euro against the Pakistani rupee, combining EUR/USD movements with rupee dynamics.",
    whyItMatters:
      "Relevant for Pakistan's trade with the eurozone and for remittances from Pakistani communities across Europe.",
  },
  {
    base: "GBP",
    quote: "PKR",
    slug: "gbp-pkr",
    group: "pkr_corridor",
    description:
      "The British pound against the Pakistani rupee.",
    whyItMatters:
      "The UK hosts one of the largest overseas Pakistani communities; GBP/PKR is a key remittance and family-finance rate.",
  },
  {
    base: "AED",
    quote: "PKR",
    slug: "aed-pkr",
    group: "pkr_corridor",
    description:
      "The UAE dirham against the Pakistani rupee. The dirham itself is pegged to the US dollar.",
    whyItMatters:
      "The UAE is consistently among Pakistan's largest remittance sources; AED/PKR is the practical rate for millions of workers sending money home.",
  },
  {
    base: "SAR",
    quote: "PKR",
    slug: "sar-pkr",
    group: "pkr_corridor",
    description:
      "The Saudi riyal against the Pakistani rupee. The riyal is pegged to the US dollar.",
    whyItMatters:
      "Saudi Arabia is Pakistan's single largest remittance corridor; SAR/PKR directly affects household incomes across the country.",
  },
  {
    base: "USD",
    quote: "INR",
    slug: "usd-inr",
    group: "major",
    description:
      "The US dollar against the Indian rupee, managed within the Reserve Bank of India's flexible framework.",
    whyItMatters:
      "USD/INR shapes India's import bill, IT-export earnings and the world's largest inbound remittance market.",
  },
  {
    base: "EUR",
    quote: "USD",
    slug: "eur-usd",
    group: "major",
    description:
      "The euro against the US dollar — the most traded currency pair in the world.",
    whyItMatters:
      "EUR/USD expresses the balance between Federal Reserve and European Central Bank policy and is the benchmark for global dollar strength.",
  },
  {
    base: "GBP",
    quote: "USD",
    slug: "gbp-usd",
    group: "major",
    description:
      "The British pound against the US dollar, known in markets as “cable”.",
    whyItMatters:
      "A gauge of UK economic conditions and Bank of England policy, and a reference rate for the UK's large international diaspora.",
  },
  {
    base: "USD",
    quote: "JPY",
    slug: "usd-jpy",
    group: "major",
    description:
      "The US dollar against the Japanese yen, one of the most liquid pairs in global markets.",
    whyItMatters:
      "USD/JPY is highly sensitive to interest-rate differentials and is a classic barometer of global risk appetite and carry-trade flows.",
  },
  {
    base: "USD",
    quote: "CAD",
    slug: "usd-cad",
    group: "major",
    description:
      "The US dollar against the Canadian dollar, a currency closely linked to oil and commodity exports.",
    whyItMatters:
      "Relevant to commodity markets and to the large South Asian diaspora earning and saving in Canadian dollars.",
  },
];

export interface CommodityInfo {
  code: string;
  slug: string;
  name: string;
  unit: string;
  currency: string;
  description: string;
  whyItMatters: string;
}

export const COMMODITIES: CommodityInfo[] = [
  {
    code: "XAU",
    slug: "gold",
    name: "Gold",
    unit: "troy ounce",
    currency: "USD",
    description:
      "The world's principal precious metal, quoted internationally in US dollars per troy ounce, with deep physical demand from jewellery, investment and central-bank reserves.",
    whyItMatters:
      "Gold is the traditional store of value across South Asia and the Gulf — a wedding-season staple, an inflation hedge and a reserve asset central banks keep buying. Local gold prices combine the international price with the domestic currency's rate.",
  },
  {
    code: "XAG",
    slug: "silver",
    name: "Silver",
    unit: "troy ounce",
    currency: "USD",
    description:
      "A precious metal with a dual role: an investment asset like gold and an industrial input for electronics and solar panels.",
    whyItMatters:
      "Silver's industrial demand makes it more cyclical than gold; the gold-silver relationship is a classic gauge of metals-market sentiment.",
  },
  {
    code: "BRENT",
    slug: "brent-oil",
    name: "Brent Crude Oil",
    unit: "barrel",
    currency: "USD",
    description:
      "The leading international crude-oil benchmark, used to price the majority of globally traded seaborne crude.",
    whyItMatters:
      "Brent sets the direction for fuel prices and import bills across energy-importing South Asia, and for the export revenues that fund Gulf economies.",
  },
  {
    code: "WTI",
    slug: "wti-oil",
    name: "WTI Crude Oil",
    unit: "barrel",
    currency: "USD",
    description:
      "West Texas Intermediate, the primary US crude-oil benchmark, priced at the Cushing, Oklahoma delivery hub.",
    whyItMatters:
      "WTI reflects North American supply and demand; its spread against Brent tells the story of US production and export flows.",
  },
];

// ---- Lookups -------------------------------------------------

const cryptoBySlug = new Map(CRYPTO_ASSETS.map((a) => [a.slug, a]));
const pairBySlug = new Map(FOREX_PAIRS.map((p) => [p.slug, p]));
const commodityBySlug = new Map(COMMODITIES.map((c) => [c.slug, c]));

export function getCryptoBySlug(slug: string): CryptoAssetInfo | null {
  return cryptoBySlug.get(slug) ?? null;
}

export function getPairBySlug(slug: string): ForexPairInfo | null {
  return pairBySlug.get(slug) ?? null;
}

export function getCommodityBySlug(slug: string): CommodityInfo | null {
  return commodityBySlug.get(slug) ?? null;
}

/** Unique currency codes available to the converter UI. */
export function converterCurrencies(): string[] {
  const codes = new Set<string>();
  for (const p of FOREX_PAIRS) {
    codes.add(p.base);
    codes.add(p.quote);
  }
  return [...codes].sort();
}
