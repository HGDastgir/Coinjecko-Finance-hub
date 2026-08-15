/**
 * The contact-form topic enum, mirrored from migration 0005.
 *
 * Kept in its own dependency-free module — not in contact-inbox.ts —
 * because that file imports "server-only" and so cannot be loaded by
 * the test runner. The enum exists twice (here and as
 * public.contact_topic in SQL), which is the same deliberate
 * duplication as the permission matrix, so a test pins the two
 * together.
 */

export const CONTACT_TOPICS = [
  "general",
  "advertising",
  "correction",
  "data_request",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export function isContactTopic(value: unknown): value is ContactTopic {
  return (
    typeof value === "string" &&
    (CONTACT_TOPICS as readonly string[]).includes(value)
  );
}

/** Human labels for the enum values stored in the database. */
export const TOPIC_LABELS: Record<ContactTopic, string> = {
  general: "General",
  advertising: "Advertising",
  correction: "Correction",
  data_request: "Data request",
};
