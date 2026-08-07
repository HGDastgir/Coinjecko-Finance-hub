import test from "node:test";
import assert from "node:assert/strict";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * The limiter keeps module-level state, so every test uses a unique
 * key rather than trying to reset it.
 */
let counter = 0;
const freshKey = () => `test:${process.pid}:${counter++}`;

test("requests are allowed up to the limit, then refused", () => {
  const key = freshKey();
  const options = { limit: 3, windowMs: 60_000 };

  for (let i = 0; i < 3; i++) {
    assert.equal(rateLimit(key, options).success, true, `request ${i + 1}`);
  }
  assert.equal(rateLimit(key, options).success, false, "4th request");
});

test("remaining counts down and never goes negative", () => {
  const key = freshKey();
  const options = { limit: 3, windowMs: 60_000 };

  assert.equal(rateLimit(key, options).remaining, 2);
  assert.equal(rateLimit(key, options).remaining, 1);
  assert.equal(rateLimit(key, options).remaining, 0);
  assert.equal(rateLimit(key, options).remaining, 0);
});

test("a refusal reports how long to wait", () => {
  const key = freshKey();
  const options = { limit: 1, windowMs: 60_000 };

  rateLimit(key, options);
  const blocked = rateLimit(key, options);

  assert.equal(blocked.success, false);
  assert.ok(blocked.retryAfterMs > 0, "retryAfterMs must be positive");
  assert.ok(blocked.retryAfterMs <= options.windowMs);
});

test("a successful request reports no wait", () => {
  assert.equal(rateLimit(freshKey(), RATE_LIMITS.api).retryAfterMs, 0);
});

test("separate keys do not share a budget", () => {
  const a = freshKey();
  const b = freshKey();
  const options = { limit: 1, windowMs: 60_000 };

  assert.equal(rateLimit(a, options).success, true);
  assert.equal(rateLimit(a, options).success, false);
  assert.equal(rateLimit(b, options).success, true, "b was charged for a");
});

test("the window expires and the budget returns", async () => {
  const key = freshKey();
  const options = { limit: 1, windowMs: 30 };

  assert.equal(rateLimit(key, options).success, true);
  assert.equal(rateLimit(key, options).success, false);

  await new Promise((resolve) => setTimeout(resolve, 45));
  assert.equal(rateLimit(key, options).success, true, "window did not expire");
});

test("being refused does not extend the ban", async () => {
  const key = freshKey();
  const options = { limit: 1, windowMs: 40 };

  rateLimit(key, options);
  // Hammer while blocked; a naive limiter would keep pushing the
  // window forward and lock the caller out indefinitely.
  for (let i = 0; i < 5; i++) rateLimit(key, options);

  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(rateLimit(key, options).success, true);
});

test("the shipped limits are sane", () => {
  for (const [name, options] of Object.entries(RATE_LIMITS)) {
    assert.ok(options.limit > 0, `${name} limit must be positive`);
    assert.ok(options.windowMs > 0, `${name} window must be positive`);
  }
  assert.ok(
    RATE_LIMITS.auth.limit < RATE_LIMITS.api.limit,
    "auth should be stricter than general API traffic",
  );
});
