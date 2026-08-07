import type { Permission } from "@/lib/auth/permissions";
import { hasPermission, type Role } from "@/lib/auth/permissions";

/**
 * Editorial workflow: draft → review → approved → published → archived.
 *
 * Mirrors `enforce_editorial_workflow()` in
 * supabase/migrations/0004_editorial_workflow_guard.sql, which is the
 * enforcement boundary. This module gates the UI and lets server code
 * reject a bad transition before it reaches the database — change one,
 * change the other (same rule as the role/permission matrix).
 */

export const CONTENT_STATUSES = [
  "draft",
  "review",
  "approved",
  "published",
  "archived",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export interface Transition {
  to: ContentStatus;
  /** Imperative label for the button that performs it. */
  label: string;
  /**
   * Permission required *in addition* to edit rights on the row.
   * null = edit rights alone are enough.
   */
  permission: Permission | null;
}

export const TRANSITIONS: Record<ContentStatus, readonly Transition[]> = {
  draft: [
    { to: "review", label: "Submit for review", permission: null },
    { to: "published", label: "Publish now", permission: "content.publish" },
    { to: "archived", label: "Archive", permission: null },
  ],
  review: [
    { to: "approved", label: "Approve", permission: "content.review" },
    { to: "draft", label: "Send back to draft", permission: null },
    { to: "archived", label: "Archive", permission: null },
  ],
  approved: [
    { to: "published", label: "Publish", permission: "content.publish" },
    { to: "review", label: "Return to review", permission: null },
    { to: "archived", label: "Archive", permission: null },
  ],
  published: [
    { to: "draft", label: "Unpublish to draft", permission: "content.publish" },
    { to: "archived", label: "Archive", permission: "content.publish" },
  ],
  archived: [{ to: "draft", label: "Restore as draft", permission: null }],
};

export function isContentStatus(value: unknown): value is ContentStatus {
  return (
    typeof value === "string" &&
    (CONTENT_STATUSES as readonly string[]).includes(value)
  );
}

/** Edit rights on a row: any-article rights, or own-article rights on your own. */
export function canEdit(role: Role | null, isOwnArticle: boolean): boolean {
  if (hasPermission(role, "content.edit_any")) return true;
  return isOwnArticle && hasPermission(role, "content.edit_own");
}

/**
 * Whether `role` may move an article from `from` to `to`. Returns the
 * reason it is refused so callers can log or surface it.
 */
export function checkTransition(
  role: Role | null,
  from: ContentStatus,
  to: ContentStatus,
  isOwnArticle: boolean,
): { allowed: true } | { allowed: false; reason: string } {
  if (!canEdit(role, isOwnArticle)) {
    return { allowed: false, reason: "No edit rights on this article" };
  }
  const transition = TRANSITIONS[from].find((t) => t.to === to);
  if (!transition) {
    return { allowed: false, reason: `Illegal transition: ${from} → ${to}` };
  }
  if (transition.permission && !hasPermission(role, transition.permission)) {
    return {
      allowed: false,
      reason: `Missing permission: ${transition.permission}`,
    };
  }
  return { allowed: true };
}

/** The transitions to actually render as buttons for this user. */
export function availableTransitions(
  role: Role | null,
  from: ContentStatus,
  isOwnArticle: boolean,
): readonly Transition[] {
  return TRANSITIONS[from].filter(
    (t) => checkTransition(role, from, t.to, isOwnArticle).allowed,
  );
}
