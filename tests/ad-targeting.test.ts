import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AD_KINDS,
  AD_PLACEMENTS,
  isAdKind,
  isAdPlacement,
} from "@/content/ad-placements";
import {
  AD_SCOPES,
  describeScope,
  isAdScope,
  isWithinFlight,
  scopeMatchesPath,
  selectAd,
  type TargetableAd,
} from "@/content/ad-targeting";

/**
 * Targeting decides which paying customer's creative appears where. A
 * bug here is not a rendering glitch — it is an ad billed and never
 * shown, or shown on a page it was never sold for.
 */

const migration = () =>
  readFileSync(
    new URL(
      "../supabase/migrations/0011_advertisement_targeting.sql",
      import.meta.url,
    ),
    "utf8",
  );

// ---------------------------------------------------------------
// Vocabulary parity with SQL
// ---------------------------------------------------------------

test("the placement vocabulary matches the check constraint in 0011", () => {
  const sql = migration();
  const match =
    /add constraint advertisements_placement_check check \(\s*placement in \(([^)]*)\)/i.exec(
      sql,
    );
  assert.ok(match, "could not find the placement check constraint in 0011");

  const fromSql = [...match[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);

  assert.deepEqual(
    fromSql.slice().sort(),
    Object.keys(AD_PLACEMENTS).slice().sort(),
    "AD_PLACEMENTS and the SQL constraint have drifted — a booking valid in one is rejected or unrenderable in the other",
  );
});

test("the kind vocabulary matches the check constraint in 0002", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/0002_content.sql", import.meta.url),
    "utf8",
  );
  const match = /kind\s+text not null check \(kind in\s*\(([^)]*)\)/i.exec(sql);
  assert.ok(match, "could not find the kind check constraint in 0002");

  const fromSql = [...match[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);

  assert.deepEqual(
    fromSql.slice().sort(),
    Object.keys(AD_KINDS).slice().sort(),
  );
});

test("every offered scope is accepted by the SQL page_scope pattern", () => {
  // The pattern the database enforces, lifted from the migration so
  // the two cannot drift: an option the form offers but the database
  // rejects is a booking that fails on save.
  const sql = migration();
  const match =
    /advertisements_page_scope_check\s*\n?\s*check \(page_scope is null or page_scope ~ '([^']+)'\)/i.exec(
      sql,
    );
  assert.ok(match, "could not find the page_scope check constraint");
  const pattern = new RegExp(match[1]);

  for (const scope of AD_SCOPES) {
    if (scope.value === null) continue;
    assert.ok(
      pattern.test(scope.value),
      `scope ${scope.value} would be rejected by the database`,
    );
  }
});

test("guards reject values outside the vocabularies", () => {
  assert.ok(isAdPlacement("in-article"));
  assert.ok(!isAdPlacement("side-rail"));
  assert.ok(isAdKind("adsense"));
  assert.ok(!isAdKind("banner"));
  assert.ok(isAdScope("/blog"));
  assert.ok(!isAdScope("/admin"));
  assert.ok(!isAdScope(""));
});

// ---------------------------------------------------------------
// Path matching
// ---------------------------------------------------------------

test("a null scope runs on every page", () => {
  for (const path of ["/", "/blog", "/markets/kse-100", "/vlogs/x"]) {
    assert.equal(scopeMatchesPath(null, path), true);
  }
});

test("a section scope covers the section and everything under it", () => {
  assert.equal(scopeMatchesPath("/blog", "/blog"), true);
  assert.equal(scopeMatchesPath("/blog", "/blog/some-post"), true);
  assert.equal(scopeMatchesPath("/blog", "/blog/deep/er"), true);
});

test("a section scope does not leak into a sibling with the same prefix", () => {
  // The failure this pins: a naive startsWith would put a campaign
  // sold for /blog on /blogroll, which is somebody else's inventory.
  assert.equal(scopeMatchesPath("/blog", "/blogroll"), false);
  assert.equal(scopeMatchesPath("/crypto", "/cryptocurrency-guide"), false);
});

test("the homepage scope matches only the homepage", () => {
  // Treating "/" as a prefix would silently turn the narrowest
  // booking on the site into the widest one.
  assert.equal(scopeMatchesPath("/", "/"), true);
  assert.equal(scopeMatchesPath("/", "/blog"), false);
  assert.equal(scopeMatchesPath("/", "/markets/kse-100"), false);
});

// ---------------------------------------------------------------
// Flight windows
// ---------------------------------------------------------------

const base: TargetableAd = {
  placement: "top-leaderboard",
  locale: null,
  pageScope: null,
  priority: 0,
  startsAt: null,
  endsAt: null,
};

const NOW = new Date("2026-08-17T12:00:00Z");

test("an open-ended campaign is always in flight", () => {
  assert.equal(isWithinFlight(base, NOW), true);
});

test("a campaign is out of flight before it starts and after it ends", () => {
  assert.equal(
    isWithinFlight({ ...base, startsAt: "2026-08-18T00:00:00Z" }, NOW),
    false,
  );
  assert.equal(
    isWithinFlight({ ...base, endsAt: "2026-08-17T11:00:00Z" }, NOW),
    false,
  );
  assert.equal(
    isWithinFlight(
      { ...base, startsAt: "2026-08-01T00:00:00Z", endsAt: "2026-09-01T00:00:00Z" },
      NOW,
    ),
    true,
  );
});

test("an unreadable flight date keeps the campaign off the site", () => {
  // Fail closed: a campaign whose schedule cannot be parsed is one
  // nobody can prove should be running.
  assert.equal(isWithinFlight({ ...base, startsAt: "not a date" }, NOW), false);
  assert.equal(isWithinFlight({ ...base, endsAt: "not a date" }, NOW), false);
});

// ---------------------------------------------------------------
// Selection
// ---------------------------------------------------------------

const ad = (over: Partial<TargetableAd> & { id: string }) => ({
  ...base,
  ...over,
});

test("selectAd honours placement, locale and page together", () => {
  const ads = [
    ad({ id: "a", placement: "in-feed" }),
    ad({ id: "b", locale: "ur" }),
    ad({ id: "c", pageScope: "/vlogs" }),
    ad({ id: "d" }),
  ];

  const chosen = selectAd(ads, {
    placement: "top-leaderboard",
    locale: "en",
    path: "/blog",
    now: NOW,
  });
  assert.equal(chosen?.id, "d");
});

test("a higher priority wins the slot", () => {
  const ads = [ad({ id: "a", priority: 1 }), ad({ id: "b", priority: 9 })];
  assert.equal(
    selectAd(ads, {
      placement: "top-leaderboard",
      locale: "en",
      path: "/",
      now: NOW,
    })?.id,
    "b",
  );
});

test("at equal priority the more specific booking wins", () => {
  // The buyer of a section should not have to know to set a priority
  // to beat a run-of-site campaign on their own section.
  const ads = [
    ad({ id: "site-wide", pageScope: null }),
    ad({ id: "section", pageScope: "/blog" }),
  ];
  assert.equal(
    selectAd(ads, {
      placement: "top-leaderboard",
      locale: "en",
      path: "/blog/post",
      now: NOW,
    })?.id,
    "section",
  );
});

test("selection is stable when everything ties", () => {
  // Otherwise two equal campaigns swap places on each ISR pass and the
  // advertiser sees a slot that flickers between two creatives.
  const ads = [ad({ id: "b2" }), ad({ id: "a1" })];
  const context = {
    placement: "top-leaderboard" as const,
    locale: "en",
    path: "/",
    now: NOW,
  };
  assert.equal(selectAd(ads, context)?.id, "a1");
  assert.equal(selectAd([...ads].reverse(), context)?.id, "a1");
});

test("an out-of-flight campaign never takes the slot from a live one", () => {
  const ads = [
    ad({ id: "expired", priority: 50, endsAt: "2026-08-01T00:00:00Z" }),
    ad({ id: "live", priority: 1 }),
  ];
  assert.equal(
    selectAd(ads, {
      placement: "top-leaderboard",
      locale: "en",
      path: "/",
      now: NOW,
    })?.id,
    "live",
  );
});

test("no eligible campaign returns null so the slot falls back", () => {
  assert.equal(
    selectAd([ad({ id: "a", pageScope: "/vlogs" })], {
      placement: "top-leaderboard",
      locale: "en",
      path: "/blog",
      now: NOW,
    }),
    null,
  );
  assert.equal(
    selectAd([], {
      placement: "top-leaderboard",
      locale: "en",
      path: "/",
      now: NOW,
    }),
    null,
  );
});

test("describeScope names every offered scope and survives an unknown one", () => {
  for (const scope of AD_SCOPES) {
    assert.equal(describeScope(scope.value), scope.label);
  }
  assert.equal(describeScope("/retired-section"), "/retired-section");
});
