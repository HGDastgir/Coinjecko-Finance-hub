import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The `Dictionary` type is derived from en.json, so a key present in
 * one locale and missing in the other is a runtime `undefined` in the
 * UI that TypeScript cannot catch. The two files must stay
 * structurally identical.
 */

const DICTIONARIES = path.resolve(import.meta.dirname, "../src/i18n/dictionaries");

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function load(locale: string): Record<string, Json> {
  return JSON.parse(
    readFileSync(path.join(DICTIONARIES, `${locale}.json`), "utf8"),
  );
}

function flatten(value: Json, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

const en = load("en");
const ur = load("ur");

test("en and ur expose exactly the same keys", () => {
  const enKeys = flatten(en as Json).sort();
  const urKeys = flatten(ur as Json).sort();

  const missingInUrdu = enKeys.filter((k) => !urKeys.includes(k));
  const extraInUrdu = urKeys.filter((k) => !enKeys.includes(k));

  assert.deepEqual(missingInUrdu, [], "keys missing from ur.json");
  assert.deepEqual(extraInUrdu, [], "keys in ur.json with no English source");
});

/**
 * `legalNotice.urduPending` is rendered only under `locale === "ur"`
 * (see [locale]/[slug]/page.tsx and AssetDetail.tsx), where it tells
 * Urdu readers the authoritative text is still English. Its English
 * value is deliberately empty and acts as the "nothing to show" flag,
 * so the emptiness check has to skip it rather than the whole file.
 */
const INTENTIONALLY_EMPTY = new Set(["en:legalNotice.urduPending"]);

test("no dictionary value is accidentally an empty string", () => {
  for (const [locale, dictionary] of [
    ["en", en],
    ["ur", ur],
  ] as const) {
    const walk = (value: Json, trail: string) => {
      if (typeof value === "string") {
        if (!INTENTIONALLY_EMPTY.has(`${locale}:${trail}`)) {
          assert.notEqual(value.trim(), "", `${locale}.json: ${trail} is empty`);
        }
        return;
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [key, child] of Object.entries(value)) {
          walk(child, trail ? `${trail}.${key}` : key);
        }
      }
    };
    walk(dictionary as Json, "");
  }
});

test("urdu strings are not left as untranslated english copies", () => {
  // A handful of proper nouns legitimately match across locales.
  const allowed = new Set(["CoinJecko", "KSE-100", "en", "ur"]);
  const enKeys = flatten(en as Json);

  const read = (dictionary: Record<string, Json>, dotted: string): Json =>
    dotted
      .split(".")
      .reduce<Json>(
        (node, key) =>
          node && typeof node === "object" && !Array.isArray(node)
            ? (node as Record<string, Json>)[key]
            : null,
        dictionary as Json,
      );

  const identical = enKeys.filter((key) => {
    const source = read(en, key);
    const target = read(ur, key);
    return (
      typeof source === "string" &&
      typeof target === "string" &&
      source === target &&
      source.length > 3 &&
      !allowed.has(source)
    );
  });

  assert.deepEqual(
    identical,
    [],
    "these Urdu values are identical to the English — likely untranslated",
  );
});
