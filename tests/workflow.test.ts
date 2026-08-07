import test from "node:test";
import assert from "node:assert/strict";
import {
  availableTransitions,
  canEdit,
  checkTransition,
  CONTENT_STATUSES,
  isContentStatus,
  TRANSITIONS,
} from "@/lib/content/workflow";

const OWN = true;
const SOMEONE_ELSES = false;

test("an author cannot publish their own draft", () => {
  const verdict = checkTransition("author", "draft", "published", OWN);
  assert.equal(verdict.allowed, false);
  assert.match(
    verdict.allowed === false ? verdict.reason : "",
    /content\.publish/,
  );
});

test("an author cannot approve content for publication", () => {
  const verdict = checkTransition("author", "review", "approved", OWN);
  assert.equal(verdict.allowed, false);
});

test("an analyst cannot publish either", () => {
  assert.equal(
    checkTransition("analyst", "approved", "published", OWN).allowed,
    false,
  );
});

test("an author can submit their own draft for review", () => {
  assert.equal(checkTransition("author", "draft", "review", OWN).allowed, true);
});

test("an author cannot touch someone else's draft", () => {
  assert.equal(
    checkTransition("author", "draft", "review", SOMEONE_ELSES).allowed,
    false,
  );
});

test("an editor can approve and then publish", () => {
  assert.equal(
    checkTransition("editor", "review", "approved", SOMEONE_ELSES).allowed,
    true,
  );
  assert.equal(
    checkTransition("editor", "approved", "published", SOMEONE_ELSES).allowed,
    true,
  );
});

test("unpublishing requires content.publish", () => {
  assert.equal(
    checkTransition("editor", "published", "draft", SOMEONE_ELSES).allowed,
    true,
  );
  assert.equal(
    checkTransition("author", "published", "draft", OWN).allowed,
    false,
  );
});

test("transitions the workflow does not define are refused", () => {
  const verdict = checkTransition("super_admin", "draft", "approved", OWN);
  assert.equal(verdict.allowed, false);
  assert.match(
    verdict.allowed === false ? verdict.reason : "",
    /Illegal transition/,
  );
});

test("a user with no role can do nothing", () => {
  for (const from of CONTENT_STATUSES) {
    for (const to of CONTENT_STATUSES) {
      assert.equal(checkTransition(null, from, to, OWN).allowed, false);
    }
  }
});

test("availableTransitions never offers an author the publish button", () => {
  const offered = availableTransitions("author", "draft", OWN).map((t) => t.to);
  assert.ok(offered.includes("review"));
  assert.ok(!offered.includes("published"));
});

test("availableTransitions agrees with checkTransition", () => {
  const roles = ["author", "editor", "analyst", "super_admin"] as const;
  for (const role of roles) {
    for (const from of CONTENT_STATUSES) {
      for (const own of [OWN, SOMEONE_ELSES]) {
        const offered = availableTransitions(role, from, own);
        for (const transition of offered) {
          assert.equal(
            checkTransition(role, from, transition.to, own).allowed,
            true,
            `${role} ${from} -> ${transition.to} (own=${own})`,
          );
        }
      }
    }
  }
});

test("canEdit honours ownership", () => {
  assert.equal(canEdit("author", OWN), true);
  assert.equal(canEdit("author", SOMEONE_ELSES), false);
  assert.equal(canEdit("editor", SOMEONE_ELSES), true);
  assert.equal(canEdit(null, OWN), false);
});

test("every status has a transition table and no self-transitions", () => {
  for (const status of CONTENT_STATUSES) {
    assert.ok(TRANSITIONS[status], `missing table for ${status}`);
    for (const transition of TRANSITIONS[status]) {
      assert.notEqual(transition.to, status, `${status} transitions to itself`);
      assert.ok(isContentStatus(transition.to));
      assert.ok(transition.label.length > 0);
    }
  }
});

test("isContentStatus rejects junk", () => {
  assert.equal(isContentStatus("Published"), false);
  assert.equal(isContentStatus(""), false);
  assert.equal(isContentStatus(null), false);
  assert.equal(isContentStatus("draft"), true);
});
