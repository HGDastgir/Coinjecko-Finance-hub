import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CONTACT_TOPICS,
  isContactTopic,
  TOPIC_LABELS,
} from "@/lib/content/contact-topics";

/**
 * public.contact_topic exists in SQL and again in TypeScript. The
 * database is the enforcement boundary; the TS copy drives the inbox
 * filter labels. If they drift, the inbox silently relabels a real
 * submission — an advertising enquiry filed as "General" is one
 * nobody prioritises.
 */
test("the topic enum matches migration 0005", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/0005_contact_messages.sql", import.meta.url),
    "utf8",
  );

  const match = /create type public\.contact_topic as enum\s*\(([^)]*)\)/i.exec(
    sql,
  );
  assert.ok(match, "could not find the contact_topic enum in migration 0005");

  const fromSql = [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);

  assert.deepEqual(
    [...CONTACT_TOPICS].sort(),
    fromSql.sort(),
    "contact-topics.ts and migration 0005 disagree about the topic list",
  );
});

test("every topic has a human label", () => {
  for (const topic of CONTACT_TOPICS) {
    assert.equal(typeof TOPIC_LABELS[topic], "string");
    assert.ok(TOPIC_LABELS[topic].length > 0, `${topic} has an empty label`);
  }
});

test("isContactTopic refuses anything not in the enum", () => {
  for (const topic of CONTACT_TOPICS) {
    assert.equal(isContactTopic(topic), true);
  }
  // A row whose topic the build does not recognise must not be trusted
  // into a Record lookup — that is how `undefined` reaches the page.
  for (const value of [
    "spam",
    "GENERAL",
    "",
    null,
    undefined,
    0,
    {},
    ["general"],
  ]) {
    assert.equal(isContactTopic(value), false, `accepted ${String(value)}`);
  }
});
