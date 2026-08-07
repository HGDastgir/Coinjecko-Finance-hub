import test from "node:test";
import assert from "node:assert/strict";
import {
  clientIpFromHeaders,
  UNKNOWN_CLIENT,
} from "@/lib/security/client-ip";

function headers(map: Record<string, string>) {
  return (name: string) => map[name.toLowerCase()] ?? null;
}

test("a forged leftmost entry does not become the rate-limit key", () => {
  // What a caller sending its own X-Forwarded-For looks like after the
  // edge appends the real address.
  const resolved = clientIpFromHeaders(
    headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }),
  );
  assert.equal(resolved, "203.0.113.9");
  assert.notEqual(resolved, "1.2.3.4");
});

test("rotating the forged entry cannot mint new buckets", () => {
  const keys = new Set(
    ["9.9.9.1", "9.9.9.2", "9.9.9.3"].map((forged) =>
      clientIpFromHeaders(
        headers({ "x-forwarded-for": `${forged}, 203.0.113.9` }),
      ),
    ),
  );
  assert.equal(keys.size, 1, "one client must map to one bucket");
});

test("a single-entry header is used as-is", () => {
  assert.equal(
    clientIpFromHeaders(headers({ "x-forwarded-for": "203.0.113.9" })),
    "203.0.113.9",
  );
});

test("edge-set headers win over x-forwarded-for", () => {
  assert.equal(
    clientIpFromHeaders(
      headers({
        "cf-connecting-ip": "203.0.113.9",
        "x-forwarded-for": "1.2.3.4",
      }),
    ),
    "203.0.113.9",
  );
  assert.equal(
    clientIpFromHeaders(
      headers({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.2.3.4" }),
    ),
    "203.0.113.9",
  );
});

test("extra trusted hops count back from the right", () => {
  const chain = { "x-forwarded-for": "1.2.3.4, 198.51.100.7, 203.0.113.9" };
  assert.equal(clientIpFromHeaders(headers(chain), 1), "203.0.113.9");
  assert.equal(clientIpFromHeaders(headers(chain), 2), "198.51.100.7");
});

test("more trusted hops than entries clamps instead of running off the front", () => {
  assert.equal(
    clientIpFromHeaders(headers({ "x-forwarded-for": "203.0.113.9" }), 9),
    "203.0.113.9",
  );
  assert.equal(
    clientIpFromHeaders(headers({ "x-forwarded-for": "a, b" }), 99),
    "a",
  );
});

test("a hop count below one is treated as one", () => {
  assert.equal(
    clientIpFromHeaders(headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }), 0),
    "5.6.7.8",
  );
});

test("missing, empty and malformed headers resolve to unknown", () => {
  assert.equal(clientIpFromHeaders(headers({})), UNKNOWN_CLIENT);
  assert.equal(
    clientIpFromHeaders(headers({ "x-forwarded-for": "" })),
    UNKNOWN_CLIENT,
  );
  assert.equal(
    clientIpFromHeaders(headers({ "x-forwarded-for": " , , " })),
    UNKNOWN_CLIENT,
  );
});

test("surrounding whitespace is stripped", () => {
  assert.equal(
    clientIpFromHeaders(headers({ "x-forwarded-for": " 1.2.3.4 ,  203.0.113.9 " })),
    "203.0.113.9",
  );
});
