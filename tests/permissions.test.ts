import test from "node:test";
import assert from "node:assert/strict";
import {
  hasPermission,
  isRole,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
} from "@/lib/auth/permissions";

test("every granted permission is a real permission", () => {
  for (const role of ROLES) {
    for (const permission of ROLE_PERMISSIONS[role]) {
      assert.ok(
        (PERMISSIONS as readonly string[]).includes(permission),
        `${role} grants unknown permission ${permission}`,
      );
    }
  }
});

test("every role has an entry in the matrix", () => {
  for (const role of ROLES) {
    assert.ok(ROLE_PERMISSIONS[role], `no permissions defined for ${role}`);
  }
});

test("only editors and super admins may publish", () => {
  const publishers = ROLES.filter((role) =>
    hasPermission(role, "content.publish"),
  );
  assert.deepEqual([...publishers].sort(), ["editor", "super_admin"]);
});

test("only editors and super admins may approve", () => {
  const reviewers = ROLES.filter((role) =>
    hasPermission(role, "content.review"),
  );
  assert.deepEqual([...reviewers].sort(), ["editor", "super_admin"]);
});

test("content roles cannot grant themselves privileges", () => {
  for (const role of ["editor", "author", "analyst"] as const) {
    assert.equal(hasPermission(role, "roles.assign"), false);
    assert.equal(hasPermission(role, "users.manage"), false);
    assert.equal(hasPermission(role, "security.configure"), false);
  }
});

test("the security admin cannot silently edit content", () => {
  assert.equal(hasPermission("security_admin", "content.publish"), false);
  assert.equal(hasPermission("security_admin", "content.edit_any"), false);
});

test("super_admin holds every permission", () => {
  for (const permission of PERMISSIONS) {
    assert.ok(
      hasPermission("super_admin", permission),
      `super_admin missing ${permission}`,
    );
  }
});

test("a missing role grants nothing", () => {
  for (const permission of PERMISSIONS) {
    assert.equal(hasPermission(null, permission), false);
    assert.equal(hasPermission(undefined, permission), false);
  }
});

test("isRole rejects junk", () => {
  assert.equal(isRole("editor"), true);
  assert.equal(isRole("Editor"), false);
  assert.equal(isRole("root"), false);
  assert.equal(isRole(null), false);
});
