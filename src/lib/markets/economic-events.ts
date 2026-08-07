import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Economic calendar.
 *
 * Two data layers:
 * 1. RECURRING_EVENTS — a factual reference guide to the scheduled
 *    releases and decisions that move the markets we cover. Editorial
 *    copy states publishers and cadence, never specific dates or
 *    forecast values.
 * 2. getUpcomingEvents() — dated events from the economic_events
 *    table (fed by a licensed provider / editorial team). Returns
 *    null while no backend is configured so the UI can show the
 *    honest gate instead of an invented schedule.
 */

export type Importance = "high" | "medium" | "low";

export interface RecurringEvent {
  country: string; // display name, EN (authoritative)
  countryCode: string; // filter key, e.g. "PK"
  title: string;
  publisher: string;
  cadence: string;
  importance: Importance;
  description: string;
}

export const CALENDAR_COUNTRIES: { code: string; nameEn: string }[] = [
  { code: "PK", nameEn: "Pakistan" },
  { code: "IN", nameEn: "India" },
  { code: "US", nameEn: "United States" },
  { code: "EU", nameEn: "Eurozone" },
  { code: "GB", nameEn: "United Kingdom" },
  { code: "JP", nameEn: "Japan" },
  { code: "CN", nameEn: "China" },
  { code: "SA", nameEn: "Saudi Arabia" },
  { code: "AE", nameEn: "United Arab Emirates" },
  { code: "XX", nameEn: "Global" },
];

export const RECURRING_EVENTS: RecurringEvent[] = [
  // --- Pakistan ------------------------------------------------
  {
    country: "Pakistan", countryCode: "PK",
    title: "SBP Monetary Policy Committee decision",
    publisher: "State Bank of Pakistan",
    cadence: "Scheduled meetings through the year (calendar published by SBP)",
    importance: "high",
    description:
      "Sets Pakistan's policy interest rate. Directly moves the KSE-100, government bond yields and rupee sentiment; the statement's language on inflation and reserves is read as closely as the rate itself.",
  },
  {
    country: "Pakistan", countryCode: "PK",
    title: "CPI inflation",
    publisher: "Pakistan Bureau of Statistics",
    cadence: "Monthly, at the start of the month",
    importance: "high",
    description:
      "The headline measure of consumer price inflation. Shapes expectations for SBP policy and real returns on savings; food and energy components matter most for households.",
  },
  {
    country: "Pakistan", countryCode: "PK",
    title: "Workers' remittances",
    publisher: "State Bank of Pakistan",
    cadence: "Monthly",
    importance: "high",
    description:
      "Inflows from overseas Pakistanis — a pillar of the external account. Strong months support the rupee; weak months tighten the dollar supply in the interbank market.",
  },
  {
    country: "Pakistan", countryCode: "PK",
    title: "Foreign exchange reserves",
    publisher: "State Bank of Pakistan",
    cadence: "Weekly",
    importance: "high",
    description:
      "SBP and commercial-bank reserve levels. Watched as the country's import cover and a key input to currency stability and IMF programme assessments.",
  },
  {
    country: "Pakistan", countryCode: "PK",
    title: "Trade balance",
    publisher: "Pakistan Bureau of Statistics",
    cadence: "Monthly",
    importance: "medium",
    description:
      "Exports minus imports. A widening deficit pressures the rupee and reserves; the energy import bill is usually the swing factor.",
  },
  {
    country: "Global", countryCode: "XX",
    title: "IMF programme reviews (Pakistan)",
    publisher: "International Monetary Fund",
    cadence: "Per the programme review schedule",
    importance: "high",
    description:
      "Staff-level agreements and board approvals unlock disbursements and anchor investor confidence. Review milestones are among the biggest single-day movers of Pakistani assets.",
  },
  // --- India ---------------------------------------------------
  {
    country: "India", countryCode: "IN",
    title: "RBI Monetary Policy Committee decision",
    publisher: "Reserve Bank of India",
    cadence: "Bi-monthly (six scheduled meetings a year)",
    importance: "high",
    description:
      "Sets India's repo rate. Moves the Nifty 50, Sensex, bond yields and USD/INR; the stance (accommodative, neutral, withdrawal) guides rate expectations.",
  },
  {
    country: "India", countryCode: "IN",
    title: "CPI inflation",
    publisher: "Ministry of Statistics (MoSPI)",
    cadence: "Monthly, around mid-month",
    importance: "high",
    description:
      "The RBI's target variable. Food inflation carries a heavy weight in India's basket, so monsoon and harvest news feed directly into rate expectations.",
  },
  {
    country: "India", countryCode: "IN",
    title: "GDP growth",
    publisher: "Ministry of Statistics (MoSPI)",
    cadence: "Quarterly",
    importance: "medium",
    description:
      "The broadest measure of Indian economic activity, shaping the earnings outlook behind the world's most-watched emerging equity market.",
  },
  // --- United States ------------------------------------------
  {
    country: "United States", countryCode: "US",
    title: "FOMC interest-rate decision",
    publisher: "US Federal Reserve",
    cadence: "Eight scheduled meetings a year",
    importance: "high",
    description:
      "The single most market-moving event in global finance. Fed decisions reprice the dollar, US yields and risk assets everywhere — including emerging-market currencies and Gulf economies whose currencies are pegged to the dollar.",
  },
  {
    country: "United States", countryCode: "US",
    title: "CPI inflation",
    publisher: "US Bureau of Labor Statistics",
    cadence: "Monthly",
    importance: "high",
    description:
      "The inflation print that drives Fed expectations. Surprises move global bonds, equities, gold and emerging-market currencies within minutes.",
  },
  {
    country: "United States", countryCode: "US",
    title: "Employment report (non-farm payrolls)",
    publisher: "US Bureau of Labor Statistics",
    cadence: "Monthly, usually the first Friday",
    importance: "high",
    description:
      "Jobs added, unemployment rate and wage growth. The classic market-moving release for the dollar and global risk appetite.",
  },
  {
    country: "United States", countryCode: "US",
    title: "GDP growth",
    publisher: "US Bureau of Economic Analysis",
    cadence: "Quarterly, with revisions",
    importance: "medium",
    description:
      "Confirms the pace of the world's largest economy; usually matters most when it surprises against the recession-or-resilience narrative.",
  },
  // --- Eurozone / UK ------------------------------------------
  {
    country: "Eurozone", countryCode: "EU",
    title: "ECB Governing Council decision",
    publisher: "European Central Bank",
    cadence: "Every six weeks",
    importance: "high",
    description:
      "Sets euro-area policy rates. Moves EUR/USD — the world's most traded pair — and European bond markets.",
  },
  {
    country: "Eurozone", countryCode: "EU",
    title: "HICP flash inflation",
    publisher: "Eurostat",
    cadence: "Monthly (flash estimate at month-end)",
    importance: "medium",
    description:
      "The eurozone's harmonised inflation estimate, guiding ECB expectations and the euro.",
  },
  {
    country: "United Kingdom", countryCode: "GB",
    title: "Bank of England MPC decision",
    publisher: "Bank of England",
    cadence: "Eight scheduled meetings a year",
    importance: "high",
    description:
      "Sets the UK's Bank Rate. Moves sterling and gilt yields — and with them GBP/PKR, a key remittance rate for the British-Pakistani community.",
  },
  {
    country: "United Kingdom", countryCode: "GB",
    title: "CPI inflation",
    publisher: "UK Office for National Statistics",
    cadence: "Monthly",
    importance: "high",
    description:
      "The UK's headline inflation print, driving Bank of England expectations and sterling.",
  },
  // --- Asia ----------------------------------------------------
  {
    country: "Japan", countryCode: "JP",
    title: "Bank of Japan policy decision",
    publisher: "Bank of Japan",
    cadence: "Eight scheduled meetings a year",
    importance: "medium",
    description:
      "Japanese policy shifts ripple through global bond markets and the yen — a funding currency for carry trades worldwide.",
  },
  {
    country: "China", countryCode: "CN",
    title: "Manufacturing PMI",
    publisher: "National Bureau of Statistics of China",
    cadence: "Monthly, at month-end",
    importance: "medium",
    description:
      "The quickest official read on Chinese factory activity — a demand signal for the commodities and export economies across Asia and the Gulf.",
  },
  {
    country: "China", countryCode: "CN",
    title: "GDP growth",
    publisher: "National Bureau of Statistics of China",
    cadence: "Quarterly",
    importance: "medium",
    description:
      "Confirms the trajectory of the world's second-largest economy and its appetite for energy and raw materials.",
  },
  // --- Gulf / energy ------------------------------------------
  {
    country: "Global", countryCode: "XX",
    title: "OPEC+ output decisions",
    publisher: "OPEC and allied producers",
    cadence: "Periodic ministerial meetings",
    importance: "high",
    description:
      "Production quotas that move Brent and WTI directly — and with them Gulf fiscal revenues and the fuel import bills of South Asia.",
  },
  {
    country: "Saudi Arabia", countryCode: "SA",
    title: "US Fed decisions (via the riyal peg)",
    publisher: "Saudi Central Bank (SAMA) follows the US Federal Reserve",
    cadence: "Follows the FOMC calendar",
    importance: "medium",
    description:
      "With the riyal pegged to the dollar, Saudi interest rates track the Fed — US policy is effectively Gulf monetary policy.",
  },
  {
    country: "United Arab Emirates", countryCode: "AE",
    title: "US Fed decisions (via the dirham peg)",
    publisher: "Central Bank of the UAE follows the US Federal Reserve",
    cadence: "Follows the FOMC calendar",
    importance: "medium",
    description:
      "The dirham's dollar peg imports US monetary policy into the UAE, shaping borrowing costs in Dubai and Abu Dhabi.",
  },
];

export interface UpcomingEvent {
  id: string;
  country: string;
  title: string;
  importance: Importance;
  eventTime: string; // ISO
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

/**
 * Dated events from the database (public-read RLS). Returns null when
 * Supabase is not configured or the query fails — the UI must then
 * show the provider gate, never an invented schedule.
 */
export async function getUpcomingEvents(): Promise<UpcomingEvent[] | null> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv;
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const supabase = createClient(
      NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
    const { data, error } = await supabase
      .from("economic_events")
      .select("id,country,title,importance,event_time,actual,forecast,previous")
      .gte("event_time", new Date().toISOString())
      .order("event_time", { ascending: true })
      .limit(50);
    if (error) {
      logger.warn("economic_events.query_failed", { dbError: error.message });
      return null;
    }
    return data.map((row) => ({
      id: String(row.id),
      country: row.country,
      title: row.title,
      importance: row.importance as Importance,
      eventTime: row.event_time,
      actual: row.actual,
      forecast: row.forecast,
      previous: row.previous,
    }));
  } catch (err) {
    logger.warn("economic_events.query_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}
