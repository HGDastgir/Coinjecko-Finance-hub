/**
 * Canonical market reference data (mirrors supabase/seed.sql).
 *
 * This static dataset renders the World Market Map before the
 * database and licensed data providers are connected; once they are,
 * quotes join from provider tables while this remains the source of
 * descriptive facts. Descriptions are original editorial copy —
 * factual, neutral, no price claims. English is authoritative; Urdu
 * body translations follow editorial review.
 */

export type Region =
  | "north_america"
  | "europe"
  | "asia_pacific"
  | "south_asia"
  | "middle_east";

export interface TradingSession {
  open: string; // "HH:MM" local
  close: string;
}

export interface ExchangeInfo {
  code: string;
  name: string;
  city: string;
  country: string;
  region: Region;
  timezone: string; // IANA
  sessions: TradingSession[];
  /** ISO weekday numbers, 1 = Monday … 7 = Sunday */
  tradingDays: number[];
}

export const EXCHANGES: ExchangeInfo[] = [
  { code: "NYSE", name: "New York Stock Exchange", city: "New York", country: "United States", region: "north_america", timezone: "America/New_York", sessions: [{ open: "09:30", close: "16:00" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "NASDAQ", name: "Nasdaq", city: "New York", country: "United States", region: "north_america", timezone: "America/New_York", sessions: [{ open: "09:30", close: "16:00" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "TSX", name: "Toronto Stock Exchange", city: "Toronto", country: "Canada", region: "north_america", timezone: "America/Toronto", sessions: [{ open: "09:30", close: "16:00" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "LSE", name: "London Stock Exchange", city: "London", country: "United Kingdom", region: "europe", timezone: "Europe/London", sessions: [{ open: "08:00", close: "16:30" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "XETRA", name: "Deutsche Börse Xetra", city: "Frankfurt", country: "Germany", region: "europe", timezone: "Europe/Berlin", sessions: [{ open: "09:00", close: "17:30" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "EURONEXT-PA", name: "Euronext Paris", city: "Paris", country: "France", region: "europe", timezone: "Europe/Paris", sessions: [{ open: "09:00", close: "17:30" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "SIX", name: "SIX Swiss Exchange", city: "Zurich", country: "Switzerland", region: "europe", timezone: "Europe/Zurich", sessions: [{ open: "09:00", close: "17:30" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "JPX", name: "Tokyo Stock Exchange", city: "Tokyo", country: "Japan", region: "asia_pacific", timezone: "Asia/Tokyo", sessions: [{ open: "09:00", close: "11:30" }, { open: "12:30", close: "15:00" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "HKEX", name: "Hong Kong Exchanges", city: "Hong Kong", country: "Hong Kong", region: "asia_pacific", timezone: "Asia/Hong_Kong", sessions: [{ open: "09:30", close: "12:00" }, { open: "13:00", close: "16:00" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "SSE", name: "Shanghai Stock Exchange", city: "Shanghai", country: "China", region: "asia_pacific", timezone: "Asia/Shanghai", sessions: [{ open: "09:30", close: "11:30" }, { open: "13:00", close: "15:00" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "SZSE", name: "Shenzhen Stock Exchange", city: "Shenzhen", country: "China", region: "asia_pacific", timezone: "Asia/Shanghai", sessions: [{ open: "09:30", close: "11:30" }, { open: "13:00", close: "14:57" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "KRX", name: "Korea Exchange", city: "Seoul", country: "South Korea", region: "asia_pacific", timezone: "Asia/Seoul", sessions: [{ open: "09:00", close: "15:30" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "TWSE", name: "Taiwan Stock Exchange", city: "Taipei", country: "Taiwan", region: "asia_pacific", timezone: "Asia/Taipei", sessions: [{ open: "09:00", close: "13:30" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "SGX", name: "Singapore Exchange", city: "Singapore", country: "Singapore", region: "asia_pacific", timezone: "Asia/Singapore", sessions: [{ open: "09:00", close: "17:00" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "ASX", name: "Australian Securities Exchange", city: "Sydney", country: "Australia", region: "asia_pacific", timezone: "Australia/Sydney", sessions: [{ open: "10:00", close: "16:00" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "PSX", name: "Pakistan Stock Exchange", city: "Karachi", country: "Pakistan", region: "south_asia", timezone: "Asia/Karachi", sessions: [{ open: "09:32", close: "15:30" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "NSE", name: "National Stock Exchange of India", city: "Mumbai", country: "India", region: "south_asia", timezone: "Asia/Kolkata", sessions: [{ open: "09:15", close: "15:30" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "BSE", name: "BSE (Bombay Stock Exchange)", city: "Mumbai", country: "India", region: "south_asia", timezone: "Asia/Kolkata", sessions: [{ open: "09:15", close: "15:30" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "TADAWUL", name: "Saudi Exchange (Tadawul)", city: "Riyadh", country: "Saudi Arabia", region: "middle_east", timezone: "Asia/Riyadh", sessions: [{ open: "10:00", close: "15:10" }], tradingDays: [7, 1, 2, 3, 4] },
  { code: "DFM", name: "Dubai Financial Market", city: "Dubai", country: "United Arab Emirates", region: "middle_east", timezone: "Asia/Dubai", sessions: [{ open: "10:00", close: "14:50" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "ADX", name: "Abu Dhabi Securities Exchange", city: "Abu Dhabi", country: "United Arab Emirates", region: "middle_east", timezone: "Asia/Dubai", sessions: [{ open: "10:00", close: "14:45" }], tradingDays: [1, 2, 3, 4, 5] },
  { code: "QSE", name: "Qatar Stock Exchange", city: "Doha", country: "Qatar", region: "middle_east", timezone: "Asia/Qatar", sessions: [{ open: "09:30", close: "13:15" }], tradingDays: [7, 1, 2, 3, 4] },
  { code: "BOURSAKW", name: "Boursa Kuwait", city: "Kuwait City", country: "Kuwait", region: "middle_east", timezone: "Asia/Kuwait", sessions: [{ open: "09:30", close: "13:00" }], tradingDays: [7, 1, 2, 3, 4] },
  { code: "BHB", name: "Bahrain Bourse", city: "Manama", country: "Bahrain", region: "middle_east", timezone: "Asia/Bahrain", sessions: [{ open: "09:30", close: "13:00" }], tradingDays: [7, 1, 2, 3, 4] },
  { code: "MSX", name: "Muscat Stock Exchange", city: "Muscat", country: "Oman", region: "middle_east", timezone: "Asia/Muscat", sessions: [{ open: "10:00", close: "14:00" }], tradingDays: [7, 1, 2, 3, 4] },
];

export interface IndexInfo {
  code: string;
  slug: string;
  name: string;
  exchangeCode: string | null;
  currency: string;
  region: Region;
  /** What the index is — factual, no price claims. */
  description: string;
  /** Why it matters to our readers. */
  whyItMatters: string;
}

export const INDICES: IndexInfo[] = [
  // --- North America ------------------------------------------
  {
    code: "DJI", slug: "dow-jones", name: "Dow Jones Industrial Average", exchangeCode: "NYSE", currency: "USD", region: "north_america",
    description: "One of the oldest US equity benchmarks, tracking 30 large, established American companies. Unusually for a major index, it is price-weighted rather than market-cap weighted.",
    whyItMatters: "Its long history makes it a widely quoted shorthand for the health of corporate America, and big moves in the Dow shape global risk sentiment from Asia's open onward.",
  },
  {
    code: "SPX", slug: "s-and-p-500", name: "S&P 500", exchangeCode: "NYSE", currency: "USD", region: "north_america",
    description: "A float-adjusted, market-cap weighted index of roughly 500 large US companies across all major sectors — the primary benchmark for US large-cap equities.",
    whyItMatters: "It is the reference point for global equity performance: pension funds, ETFs and central banks all watch it, and its direction influences flows into emerging markets including Pakistan and India.",
  },
  {
    code: "IXIC", slug: "nasdaq-composite", name: "Nasdaq Composite", exchangeCode: "NASDAQ", currency: "USD", region: "north_america",
    description: "A market-cap weighted index covering essentially all stocks listed on the Nasdaq exchange, with a heavy weighting toward technology and growth companies.",
    whyItMatters: "It is the clearest single gauge of global technology sentiment — relevant to tech workers, startup ecosystems and IT exporters across South Asia and the Gulf.",
  },
  {
    code: "RUT", slug: "russell-2000", name: "Russell 2000", exchangeCode: "NYSE", currency: "USD", region: "north_america",
    description: "The most widely followed benchmark for US small-cap equities, tracking about 2,000 smaller companies in the Russell 3000 universe.",
    whyItMatters: "Small caps are more sensitive to domestic US credit conditions and interest rates, so the Russell 2000 often signals turns in the US economy before the large-cap indices do.",
  },
  {
    code: "GSPTSE", slug: "tsx-composite", name: "S&P/TSX Composite", exchangeCode: "TSX", currency: "CAD", region: "north_america",
    description: "The headline benchmark of the Toronto Stock Exchange, covering the broad Canadian equity market with substantial weightings in financials, energy and materials.",
    whyItMatters: "Canada hosts large South Asian and Middle Eastern diasporas; the TSX and the Canadian dollar matter for remittances, savings and cross-border investment decisions.",
  },
  // --- Europe --------------------------------------------------
  {
    code: "UKX", slug: "ftse-100", name: "FTSE 100", exchangeCode: "LSE", currency: "GBP", region: "europe",
    description: "The 100 largest companies listed on the London Stock Exchange by market capitalisation. Many constituents are multinationals earning most of their revenue outside the UK.",
    whyItMatters: "London remains a global financial hub tightly linked to Gulf and South Asian capital; the FTSE 100 and sterling affect UK-based diaspora savings and trade finance.",
  },
  {
    code: "MCX", slug: "ftse-250", name: "FTSE 250", exchangeCode: "LSE", currency: "GBP", region: "europe",
    description: "The next 250 largest UK-listed companies after the FTSE 100 — more domestically focused, and often read as a purer gauge of the British economy.",
    whyItMatters: "Because its constituents earn more revenue at home, the FTSE 250 reacts more directly to UK rates, housing and consumer data than the multinational-heavy FTSE 100.",
  },
  {
    code: "DAX", slug: "dax", name: "DAX", exchangeCode: "XETRA", currency: "EUR", region: "europe",
    description: "Germany's blue-chip index, tracking 40 major companies trading on Deutsche Börse's Xetra platform. It is a performance (total-return) index, reinvesting dividends.",
    whyItMatters: "Germany is Europe's largest economy and a top export destination; DAX direction reflects European industrial demand that feeds through to Asian and Middle Eastern trade.",
  },
  {
    code: "CAC", slug: "cac-40", name: "CAC 40", exchangeCode: "EURONEXT-PA", currency: "EUR", region: "europe",
    description: "The benchmark index of Euronext Paris, tracking 40 of the largest and most liquid French companies, including global leaders in luxury, energy and aerospace.",
    whyItMatters: "Its luxury and consumer heavyweights make the CAC 40 a useful read on global discretionary spending, including demand from Gulf and Asian consumers.",
  },
  {
    code: "SX5E", slug: "euro-stoxx-50", name: "Euro Stoxx 50", exchangeCode: null, currency: "EUR", region: "europe",
    description: "A blue-chip index of 50 leading companies from across the eurozone, designed as a single benchmark for the currency bloc's largest listed firms.",
    whyItMatters: "It is the standard instrument for expressing a view on eurozone equities as a whole, and a common reference for structured products sold worldwide.",
  },
  {
    code: "IBEX", slug: "ibex-35", name: "IBEX 35", exchangeCode: null, currency: "EUR", region: "europe",
    description: "Spain's benchmark index, tracking the 35 most liquid stocks traded on the Spanish stock market, with large weights in banking, utilities and telecoms.",
    whyItMatters: "Spanish banks are significant lenders in Latin America and Europe; the IBEX offers a window into southern-European credit conditions.",
  },
  {
    code: "FTSEMIB", slug: "ftse-mib", name: "FTSE MIB", exchangeCode: null, currency: "EUR", region: "europe",
    description: "Italy's headline equity index, tracking the leading companies listed on Borsa Italiana across banking, energy, utilities and manufacturing.",
    whyItMatters: "As the benchmark of the eurozone's third-largest economy, the FTSE MIB is closely tied to European sovereign-debt sentiment and bank health.",
  },
  {
    code: "SMI", slug: "smi", name: "Swiss Market Index", exchangeCode: "SIX", currency: "CHF", region: "europe",
    description: "The blue-chip index of the SIX Swiss Exchange, tracking 20 of the largest Swiss companies, dominated by pharmaceuticals, food and financial services.",
    whyItMatters: "Switzerland and the franc are traditional safe havens; the SMI's defensive profile makes it a useful barometer in risk-off markets.",
  },
  // --- Asia-Pacific -------------------------------------------
  {
    code: "NKY", slug: "nikkei-225", name: "Nikkei 225", exchangeCode: "JPX", currency: "JPY", region: "asia_pacific",
    description: "Japan's most quoted equity index, tracking 225 large companies listed on the Tokyo Stock Exchange. Like the Dow, it is price-weighted.",
    whyItMatters: "Tokyo is the first major market to trade each day; the Nikkei's open often sets the tone for the global session that follows through Asia and into Europe.",
  },
  {
    code: "TPX", slug: "topix", name: "TOPIX", exchangeCode: "JPX", currency: "JPY", region: "asia_pacific",
    description: "A broad, market-cap weighted index of companies on the Tokyo Stock Exchange's Prime market — wider and more representative than the Nikkei 225.",
    whyItMatters: "Institutional investors prefer TOPIX for measuring Japan's overall market, making it the better gauge of structural shifts in Japanese equities.",
  },
  {
    code: "HSI", slug: "hang-seng", name: "Hang Seng Index", exchangeCode: "HKEX", currency: "HKD", region: "asia_pacific",
    description: "The benchmark of the Hong Kong market, tracking its largest and most liquid listings — including many mainland Chinese companies with international investor access.",
    whyItMatters: "The Hang Seng is the main bridge between global capital and Chinese corporates, so it moves on both Chinese policy and global rate expectations.",
  },
  {
    code: "SHCOMP", slug: "shanghai-composite", name: "Shanghai Composite", exchangeCode: "SSE", currency: "CNY", region: "asia_pacific",
    description: "A composite index covering the shares listed on the Shanghai Stock Exchange, the primary venue for large state-linked and financial enterprises in mainland China.",
    whyItMatters: "China is the largest trading partner for much of Asia and the Gulf; Shanghai's direction signals domestic Chinese demand that drives commodity and export cycles.",
  },
  {
    code: "SZCOMP", slug: "shenzhen-component", name: "Shenzhen Component", exchangeCode: "SZSE", currency: "CNY", region: "asia_pacific",
    description: "The headline index of the Shenzhen Stock Exchange, tracking leading listings on a venue known for private-sector manufacturers and technology firms.",
    whyItMatters: "Shenzhen skews toward China's newer economy — electronics, EV supply chains, healthcare — complementing Shanghai's state-heavy profile.",
  },
  {
    code: "KOSPI", slug: "kospi", name: "KOSPI", exchangeCode: "KRX", currency: "KRW", region: "asia_pacific",
    description: "The main index of the Korea Exchange, covering common stocks on its main board, led by semiconductor, battery and heavy-industry champions.",
    whyItMatters: "Korea sits at the heart of global chip and battery supply chains; the KOSPI is an early indicator for worldwide electronics demand.",
  },
  {
    code: "TWII", slug: "taiwan-weighted", name: "Taiwan Weighted Index", exchangeCode: "TWSE", currency: "TWD", region: "asia_pacific",
    description: "The capitalisation-weighted benchmark of the Taiwan Stock Exchange, dominated by the island's world-leading semiconductor industry.",
    whyItMatters: "With advanced chipmaking concentrated in Taiwan, this index tracks a chokepoint of the global technology supply chain.",
  },
  {
    code: "STI", slug: "straits-times", name: "Straits Times Index", exchangeCode: "SGX", currency: "SGD", region: "asia_pacific",
    description: "Singapore's benchmark index, tracking around 30 of the largest companies on the Singapore Exchange, with banks and property groups prominent.",
    whyItMatters: "Singapore is Southeast Asia's financial hub and a major offshore centre for South Asian wealth; the STI reflects regional trade and banking health.",
  },
  {
    code: "AS51", slug: "asx-200", name: "S&P/ASX 200", exchangeCode: "ASX", currency: "AUD", region: "asia_pacific",
    description: "Australia's primary equity benchmark, tracking the 200 largest ASX-listed companies, with heavy weights in miners and banks.",
    whyItMatters: "Australian miners supply iron ore, coal and LNG across Asia; the ASX 200 responds quickly to commodity cycles that also drive Gulf energy revenues.",
  },
  // --- South Asia ---------------------------------------------
  {
    code: "KSE100", slug: "kse-100", name: "KSE-100", exchangeCode: "PSX", currency: "PKR", region: "south_asia",
    description: "The benchmark index of the Pakistan Stock Exchange, tracking around 100 companies selected to represent the market's sectors and largest listings by capitalisation.",
    whyItMatters: "The KSE-100 is the single most-watched number in Pakistani finance — moving on monetary policy, IMF programme news, currency pressure and political developments, and shaping sentiment for local savers and businesses.",
  },
  {
    code: "NIFTY", slug: "nifty-50", name: "Nifty 50", exchangeCode: "NSE", currency: "INR", region: "south_asia",
    description: "The flagship index of India's National Stock Exchange, tracking 50 of the country's largest and most liquid companies across major sectors.",
    whyItMatters: "India is one of the world's fastest-growing large economies; the Nifty 50 is the primary lens on that growth for domestic and foreign investors alike.",
  },
  {
    code: "SENSEX", slug: "bse-sensex", name: "BSE Sensex", exchangeCode: "BSE", currency: "INR", region: "south_asia",
    description: "The historic benchmark of the Bombay Stock Exchange, tracking 30 large, established Indian companies — one of Asia's oldest equity indices.",
    whyItMatters: "With decades of history, the Sensex is India's most recognised market number and a staple reference for household investors across the subcontinent.",
  },
  // --- Middle East --------------------------------------------
  {
    code: "TASI", slug: "tadawul-tasi", name: "Tadawul All Share (TASI)", exchangeCode: "TADAWUL", currency: "SAR", region: "middle_east",
    description: "The all-share index of the Saudi Exchange, the largest stock market in the Arab world, spanning banking, petrochemicals, telecoms and the region's biggest listings.",
    whyItMatters: "Saudi Arabia anchors Gulf capital markets and hosts millions of South Asian expatriate workers; TASI reflects the economy behind the region's largest remittance flows.",
  },
  {
    code: "DFMGI", slug: "dfm-general", name: "DFM General Index", exchangeCode: "DFM", currency: "AED", region: "middle_east",
    description: "The general index of the Dubai Financial Market, tracking listed companies concentrated in banking, real estate, utilities and transport.",
    whyItMatters: "Dubai is the commercial gateway between South Asia, Africa and the West; DFM performance mirrors trade, property and tourism cycles that employ large expatriate communities.",
  },
  {
    code: "ADSMI", slug: "adx-general", name: "ADX General Index", exchangeCode: "ADX", currency: "AED", region: "middle_east",
    description: "The benchmark of the Abu Dhabi Securities Exchange, home to some of the Gulf's largest listed companies in energy, banking and holding groups.",
    whyItMatters: "Abu Dhabi commands substantial sovereign wealth; its market signals how Gulf capital is being deployed at home and abroad.",
  },
  {
    code: "QEAS", slug: "qe-index", name: "QE Index", exchangeCode: "QSE", currency: "QAR", region: "middle_east",
    description: "The benchmark index of the Qatar Stock Exchange, tracking its largest and most liquid listed companies, led by banks and industrials.",
    whyItMatters: "Qatar is a top global LNG exporter; its market tracks energy revenues that fund investment across Asia and Europe.",
  },
  {
    code: "BKA", slug: "boursa-kuwait-all", name: "Boursa Kuwait All Share", exchangeCode: "BOURSAKW", currency: "KWD", region: "middle_east",
    description: "The broad index of Boursa Kuwait, covering the exchange's listed companies with banking groups among the heaviest weights.",
    whyItMatters: "Kuwait combines OPEC oil revenues with one of the region's oldest investment cultures; its market reflects Gulf liquidity conditions.",
  },
  {
    code: "BAX", slug: "bahrain-all-share", name: "Bahrain All Share", exchangeCode: "BHB", currency: "BHD", region: "middle_east",
    description: "The all-share index of the Bahrain Bourse, tracking the kingdom's listed banks, telecoms and industrial companies.",
    whyItMatters: "Bahrain is a long-established Gulf banking centre; its market offers a quieter but persistent signal on regional financial health.",
  },
  {
    code: "MSM30", slug: "msx-30", name: "MSX 30", exchangeCode: "MSX", currency: "OMR", region: "middle_east",
    description: "The benchmark index of Oman's Muscat Stock Exchange, tracking its leading listed companies across banking, services and industry.",
    whyItMatters: "Oman's market moves with oil revenues and Gulf investment cycles that directly affect its large expatriate workforce.",
  },
];

/** Regional hub pages (Level 2 of the information architecture). */
export interface MarketHub {
  slug: string;
  titleEn: string;
  titleUr: string;
  introEn: string;
  exchangeCodes: string[];
}

export const MARKET_HUBS: MarketHub[] = [
  {
    slug: "pakistan",
    titleEn: "Pakistan Markets",
    titleUr: "پاکستان کی مارکیٹیں",
    introEn:
      "Pakistan's capital market centres on the Pakistan Stock Exchange in Karachi and its KSE-100 benchmark. Market direction here is shaped by State Bank of Pakistan policy, inflation, the rupee, IMF programme milestones and regional flows — the context our Pakistan Rupee Watch and Global Market Pulse series track.",
    exchangeCodes: ["PSX"],
  },
  {
    slug: "india",
    titleEn: "India Markets",
    titleUr: "بھارت کی مارکیٹیں",
    introEn:
      "India's equity market runs on two Mumbai exchanges: the National Stock Exchange with its Nifty 50 benchmark and the historic BSE with the Sensex. One of the world's most actively traded emerging markets, it moves on domestic growth, Reserve Bank of India policy and global fund flows.",
    exchangeCodes: ["NSE", "BSE"],
  },
  {
    slug: "middle-east",
    titleEn: "Middle East Markets",
    titleUr: "مشرقِ وسطیٰ کی مارکیٹیں",
    introEn:
      "Gulf markets — led by Saudi Arabia's Tadawul and the UAE's Dubai and Abu Dhabi exchanges — trade on energy revenues, sovereign investment programmes and regional diversification plans. Note the different trading week: several Gulf exchanges trade Sunday to Thursday.",
    exchangeCodes: ["TADAWUL", "DFM", "ADX", "QSE", "BOURSAKW", "BHB", "MSX"],
  },
  {
    slug: "united-states",
    titleEn: "United States Markets",
    titleUr: "امریکہ کی مارکیٹیں",
    introEn:
      "The New York Stock Exchange and Nasdaq anchor the world's deepest capital market. US index moves, Federal Reserve policy and Treasury yields set the tone for global risk appetite — including flows into and out of emerging markets.",
    exchangeCodes: ["NYSE", "NASDAQ"],
  },
  {
    slug: "europe",
    titleEn: "Europe Markets",
    titleUr: "یورپ کی مارکیٹیں",
    introEn:
      "From London's FTSE 100 to Frankfurt's DAX and Paris's CAC 40, European markets bridge the Asian close and the US open. They respond to European Central Bank and Bank of England policy, energy prices and the export demand of the eurozone's industrial core.",
    exchangeCodes: ["LSE", "XETRA", "EURONEXT-PA", "SIX"],
  },
  {
    slug: "asia-pacific",
    titleEn: "Asia-Pacific Markets",
    titleUr: "ایشیا پیسیفک کی مارکیٹیں",
    introEn:
      "Asia-Pacific opens the global trading day: Tokyo, Seoul and Sydney first, then Hong Kong, Shanghai, Shenzhen, Taipei and Singapore. The region hosts the world's semiconductor heartland and its largest commodity importers, making its sessions an early read on global demand.",
    exchangeCodes: ["JPX", "HKEX", "SSE", "SZSE", "KRX", "TWSE", "SGX", "ASX"],
  },
  {
    slug: "canada",
    titleEn: "Canada Markets",
    titleUr: "کینیڈا کی مارکیٹیں",
    introEn:
      "The Toronto Stock Exchange and its S&P/TSX Composite benchmark represent a resource- and bank-heavy market closely tied to commodity prices and US demand — and a home market for large South Asian and Middle Eastern diaspora communities.",
    exchangeCodes: ["TSX"],
  },
];

// ---- Lookups -------------------------------------------------

const exchangeByCode = new Map(EXCHANGES.map((e) => [e.code, e]));
const indexBySlug = new Map(INDICES.map((i) => [i.slug, i]));
const hubBySlug = new Map(MARKET_HUBS.map((h) => [h.slug, h]));

export function getExchange(code: string | null): ExchangeInfo | null {
  return code ? (exchangeByCode.get(code) ?? null) : null;
}

export function getIndexBySlug(slug: string): IndexInfo | null {
  return indexBySlug.get(slug) ?? null;
}

export function getHubBySlug(slug: string): MarketHub | null {
  return hubBySlug.get(slug) ?? null;
}

export function getHubIndices(hub: MarketHub): IndexInfo[] {
  const codes = new Set(hub.exchangeCodes);
  const viaExchange = INDICES.filter(
    (i) => i.exchangeCode && codes.has(i.exchangeCode),
  );
  // Pan-regional indices without a home exchange (e.g. Euro Stoxx 50)
  // attach to the matching regional hub.
  const regionOfHub = getExchange(hub.exchangeCodes[0])?.region;
  const panRegional = INDICES.filter(
    (i) => !i.exchangeCode && i.region === regionOfHub,
  );
  return [...viaExchange, ...panRegional];
}

export function getHubForIndex(index: IndexInfo): MarketHub | null {
  return (
    MARKET_HUBS.find((h) =>
      index.exchangeCode
        ? h.exchangeCodes.includes(index.exchangeCode)
        : getExchange(h.exchangeCodes[0])?.region === index.region,
    ) ?? null
  );
}

/**
 * The index that best represents an exchange, used to give exchange
 * cards somewhere to link. Exchanges have no page of their own — the
 * index page is where a reader learns what that market is.
 */
export function primaryIndexForExchange(
  exchangeCode: string,
): IndexInfo | null {
  return INDICES.find((i) => i.exchangeCode === exchangeCode) ?? null;
}
