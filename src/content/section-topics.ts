/**
 * Display order for each section's coverage topics.
 *
 * The slugs live here rather than in the dictionaries because they are
 * locale-neutral: they are the tag slugs articles are filed under, and
 * they appear in URLs (`/en/blog?topic=saving-deposits`). The
 * dictionaries hold only the translated title and description, keyed by
 * the same slug — so a topic that exists in one locale and not the
 * other is caught by the dictionary parity test.
 *
 * Every slug here must exist as a key under
 * `sections.<section>.topics` in both en.json and ur.json, and should
 * exist as a row in `public.tags` for the blog filter to match
 * anything. A slug with no tag simply returns no articles, which is
 * the honest answer rather than an error.
 */

export const BUSINESS_TOPICS = [
  "earnings-results",
  "corporate-strategy",
  "banking-credit",
  "trade-supply-chains",
  "energy-industry",
  "policy-regulation",
] as const;

export const PERSONAL_FINANCE_TOPICS = [
  "saving-deposits",
  "borrowing-debt",
  "budgeting-inflation",
  "investing-basics",
  "remittances-transfers",
  "insurance-protection",
] as const;

export type TopicSlug =
  | (typeof BUSINESS_TOPICS)[number]
  | (typeof PERSONAL_FINANCE_TOPICS)[number];

const ALL_TOPICS: readonly string[] = [
  ...BUSINESS_TOPICS,
  ...PERSONAL_FINANCE_TOPICS,
];

/** Query params are attacker-controlled; only known slugs get through. */
export function isTopicSlug(value: unknown): value is TopicSlug {
  return typeof value === "string" && ALL_TOPICS.includes(value);
}
