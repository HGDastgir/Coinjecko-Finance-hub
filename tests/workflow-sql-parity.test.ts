import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CONTENT_STATUSES,
  TRANSITIONS,
  type ContentStatus,
} from "@/lib/content/workflow";

/**
 * The editorial transition rules exist twice by design: the trigger in
 * migration 0004 is the enforcement boundary, and src/lib/content/
 * workflow.ts mirrors it for UI gating. That duplication is only safe
 * while the two agree, so this test parses the migration and compares.
 *
 * If it fails, one side was changed without the other — fix the pair,
 * do not relax the test.
 */

const MIGRATION = path.resolve(
  import.meta.dirname,
  "../supabase/migrations/0004_editorial_workflow_guard.sql",
);

const sql = readFileSync(MIGRATION, "utf8");

function parseSqlTransitions(): Map<ContentStatus, Set<string>> {
  const pattern =
    /\(old\.status\s*=\s*'(\w+)'\s+and\s+new\.status\s+(?:in\s*\(([^)]*)\)|=\s*'(\w+)')\)/g;
  const parsed = new Map<ContentStatus, Set<string>>();

  for (const match of sql.matchAll(pattern)) {
    const [, from, inList, single] = match;
    const targets = inList
      ? [...inList.matchAll(/'(\w+)'/g)].map((m) => m[1])
      : [single];
    parsed.set(from as ContentStatus, new Set(targets));
  }
  return parsed;
}

test("the migration's transition table parses", () => {
  const parsed = parseSqlTransitions();
  assert.ok(
    parsed.size > 0,
    "parsed no transitions — the migration's shape changed and this test needs updating",
  );
  assert.equal(parsed.size, CONTENT_STATUSES.length);
});

test("SQL and TypeScript allow exactly the same transitions", () => {
  const parsed = parseSqlTransitions();

  for (const status of CONTENT_STATUSES) {
    const fromSql = parsed.get(status);
    assert.ok(fromSql, `migration 0004 has no rule for '${status}'`);

    const fromTypeScript = new Set(TRANSITIONS[status].map((t) => t.to));
    assert.deepEqual(
      [...fromTypeScript].sort(),
      [...fromSql].sort(),
      `'${status}' differs between migration 0004 and workflow.ts`,
    );
  }
});

test("the migration gates publication on content.publish", () => {
  assert.match(
    sql,
    /new\.status\s*=\s*'published'\s+or\s+old\.status\s*=\s*'published'/,
    "expected the trigger to treat entering *and* leaving published as privileged",
  );
  assert.match(sql, /has_permission\('content\.publish'\)/);
});

test("the migration gates approval on content.review", () => {
  assert.match(sql, /has_permission\('content\.review'\)/);
});

test("TypeScript requires content.publish wherever published is involved", () => {
  for (const status of CONTENT_STATUSES) {
    for (const transition of TRANSITIONS[status]) {
      if (transition.to === "published" || status === "published") {
        assert.equal(
          transition.permission,
          "content.publish",
          `${status} -> ${transition.to} should require content.publish`,
        );
      }
    }
  }
});

test("TypeScript requires content.review to approve", () => {
  const approve = TRANSITIONS.review.find((t) => t.to === "approved");
  assert.ok(approve);
  assert.equal(approve.permission, "content.review");
});

test("inserts cannot be born published without content.publish", () => {
  assert.match(
    sql,
    /status\s*=\s*'published'\s+and\s+public\.has_permission\('content\.publish'\)/,
    "the INSERT policy must gate a row created directly as published",
  );
});
