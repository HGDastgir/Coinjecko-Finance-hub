import test from "node:test";
import assert from "node:assert/strict";
import { lastCsvQuote } from "@/lib/markets/csv-quote";

/**
 * The oil fallback parses a CSV published by a third party. It is
 * treated as untrusted text: only rows matching the documented
 * `YYYY-MM-DD,price` shape are accepted, and the newest usable one
 * wins. A malformed tail must never become a price on a finance page.
 */

const HEADER = "Date,Price";

test("returns the last usable row, not the last line", () => {
  const csv = [HEADER, "2026-08-01,88.10", "2026-08-03,88.90"].join("\n");
  assert.deepEqual(lastCsvQuote(csv), { price: 88.9, date: "2026-08-03" });
});

test("skips a malformed tail and falls back to the newest good row", () => {
  const csv = [
    HEADER,
    "2026-08-01,88.10",
    "2026-08-03,88.90",
    "2026-08-04,",
    "not,a,row",
    "",
  ].join("\n");
  assert.deepEqual(lastCsvQuote(csv), { price: 88.9, date: "2026-08-03" });
});

test("windows line endings and trailing whitespace parse", () => {
  const csv = `${HEADER}\r\n2026-08-03,88.90\r\n`;
  assert.deepEqual(lastCsvQuote(csv), { price: 88.9, date: "2026-08-03" });
});

test("the header alone yields nothing", () => {
  assert.equal(lastCsvQuote(HEADER), null);
  assert.equal(lastCsvQuote(""), null);
});

/**
 * A zero or negative price is not a cheap barrel of oil, it is a
 * broken feed — and April 2020 proved negative settlements are real,
 * which is exactly why one must never be rendered as a live quote.
 */
test("non-positive prices are refused", () => {
  for (const bad of ["2026-08-03,0", "2026-08-03,-37.63"]) {
    assert.equal(lastCsvQuote([HEADER, bad].join("\n")), null, bad);
  }
});

test("a row that is not a date is ignored", () => {
  const csv = [HEADER, "2026-8-3,88.90", "03/08/2026,88.90"].join("\n");
  assert.equal(lastCsvQuote(csv), null);
});

test("injected text cannot become a price", () => {
  const csv = [
    HEADER,
    "2026-08-03,88.90",
    "2026-08-04,<script>alert(1)</script>",
    "2026-08-05,NaN",
    "2026-08-06,1e999",
  ].join("\n");
  assert.deepEqual(lastCsvQuote(csv), { price: 88.9, date: "2026-08-03" });
});
