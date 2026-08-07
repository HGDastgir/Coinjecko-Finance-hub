import test from "node:test";
import assert from "node:assert/strict";
import {
  buildContentSecurityPolicy,
  generateNonce,
  securityHeaders,
} from "@/lib/security/headers";

const NONCE = "dGVzdC1ub25jZS0xMjM0";

function directives(policy: string): Map<string, string> {
  return new Map(
    policy.split(";").map((part) => {
      const trimmed = part.trim();
      const space = trimmed.indexOf(" ");
      return space === -1
        ? [trimmed, ""]
        : [trimmed.slice(0, space), trimmed.slice(space + 1)];
    }),
  );
}

test("the strict-nonce policy carries the nonce and no inline escape hatch", () => {
  const policy = buildContentSecurityPolicy({
    nonce: NONCE,
    isDev: false,
    mode: "strict-nonce",
  });
  const scriptSrc = directives(policy).get("script-src") ?? "";

  assert.ok(scriptSrc.includes(`'nonce-${NONCE}'`));
  assert.ok(scriptSrc.includes("'strict-dynamic'"));
  assert.ok(
    !scriptSrc.includes("'unsafe-inline'"),
    "a nonce policy must not also allow arbitrary inline script",
  );
});

test("production never allows eval", () => {
  for (const mode of ["strict-nonce", "static-site"] as const) {
    const policy = buildContentSecurityPolicy({
      nonce: NONCE,
      isDev: false,
      mode,
    });
    assert.ok(
      !policy.includes("'unsafe-eval'"),
      `${mode} leaked unsafe-eval into production`,
    );
  }
});

test("unsafe-eval is confined to development", () => {
  const policy = buildContentSecurityPolicy({
    nonce: NONCE,
    isDev: true,
    mode: "strict-nonce",
  });
  assert.ok(policy.includes("'unsafe-eval'"));
});

test("the clickjacking and injection floor holds in every mode", () => {
  for (const mode of ["strict-nonce", "static-site"] as const) {
    for (const isDev of [true, false]) {
      const parsed = directives(
        buildContentSecurityPolicy({ nonce: NONCE, isDev, mode }),
      );
      assert.equal(parsed.get("frame-ancestors"), "'none'");
      assert.equal(parsed.get("object-src"), "'none'");
      assert.equal(parsed.get("base-uri"), "'self'");
      assert.equal(parsed.get("form-action"), "'self'");
      assert.equal(parsed.get("default-src"), "'self'");
    }
  }
});

test("production upgrades insecure requests, development does not", () => {
  assert.ok(
    buildContentSecurityPolicy({
      nonce: NONCE,
      isDev: false,
      mode: "static-site",
    }).includes("upgrade-insecure-requests"),
  );
  assert.ok(
    !buildContentSecurityPolicy({
      nonce: NONCE,
      isDev: true,
      mode: "static-site",
    }).includes("upgrade-insecure-requests"),
  );
});

test("connect-src starts closed and only widens to listed origins", () => {
  const closed = directives(
    buildContentSecurityPolicy({
      nonce: NONCE,
      isDev: false,
      mode: "static-site",
    }),
  ).get("connect-src");
  assert.equal(closed, "'self'");

  const widened = directives(
    buildContentSecurityPolicy({
      nonce: NONCE,
      isDev: false,
      mode: "static-site",
      connectOrigins: ["https://proj.supabase.co", "wss://proj.supabase.co"],
    }),
  ).get("connect-src");
  assert.equal(widened, "'self' https://proj.supabase.co wss://proj.supabase.co");
});

test("no directive is silently dropped between modes", () => {
  const strict = directives(
    buildContentSecurityPolicy({ nonce: NONCE, isDev: false, mode: "strict-nonce" }),
  );
  const staticSite = directives(
    buildContentSecurityPolicy({ nonce: NONCE, isDev: false, mode: "static-site" }),
  );
  assert.deepEqual([...strict.keys()].sort(), [...staticSite.keys()].sort());
});

test("HSTS is production-only and long-lived", () => {
  const production = securityHeaders(false);
  assert.match(
    production["Strict-Transport-Security"] ?? "",
    /max-age=\d{7,}/,
    "HSTS max-age should be at least months, not seconds",
  );
  assert.ok(!("Strict-Transport-Security" in securityHeaders(true)));
});

test("the standard hardening headers are always present", () => {
  for (const isDev of [true, false]) {
    const headers = securityHeaders(isDev);
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.equal(headers["X-Frame-Options"], "DENY");
    assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
    assert.equal(headers["Cross-Origin-Opener-Policy"], "same-origin");
    assert.match(headers["Permissions-Policy"] ?? "", /camera=\(\)/);
  }
});

test("nonces are unpredictable and not reused", () => {
  const nonces = new Set(Array.from({ length: 500 }, () => generateNonce()));
  assert.equal(nonces.size, 500, "generateNonce repeated a value");

  for (const nonce of nonces) {
    assert.match(nonce, /^[A-Za-z0-9+/]+={0,2}$/, "nonce must be base64");
    // 16 random bytes; anything shorter is not worth calling a nonce.
    assert.ok(Buffer.from(nonce, "base64").length >= 16);
  }
});
