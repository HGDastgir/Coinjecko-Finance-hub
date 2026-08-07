/**
 * Role-based access control model.
 *
 * Mirrors the database (`app_role` enum + `role_permissions` table in
 * supabase/migrations). The database is the enforcement layer (RLS);
 * this module exists for UI gating and defence-in-depth checks in
 * server code. Least privilege: a role gets only what it needs.
 */

export const ROLES = [
  "super_admin",
  "security_admin",
  "editor",
  "author",
  "market_data_manager",
  "video_manager",
  "advertising_manager",
  "newsletter_manager",
  "analyst",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // content
  "content.create",
  "content.edit_own",
  "content.edit_any",
  "content.review",
  "content.publish",
  "content.delete",
  // taxonomy
  "taxonomy.manage",
  // media
  "media.upload",
  "media.manage_video",
  "media.manage_podcast",
  // market data
  "market_data.manage",
  "market_data.configure_providers",
  // monetisation
  "ads.manage",
  "newsletter.manage",
  // users & security
  "users.manage",
  "roles.assign",
  "audit.read",
  "security.configure",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: ALL,
  security_admin: ["audit.read", "security.configure", "users.manage", "roles.assign"],
  editor: [
    "content.create",
    "content.edit_own",
    "content.edit_any",
    "content.review",
    "content.publish",
    "content.delete",
    "taxonomy.manage",
    "media.upload",
  ],
  author: ["content.create", "content.edit_own", "media.upload"],
  market_data_manager: ["market_data.manage", "market_data.configure_providers"],
  video_manager: ["media.upload", "media.manage_video"],
  advertising_manager: ["ads.manage"],
  newsletter_manager: ["newsletter.manage"],
  analyst: ["content.create", "content.edit_own"],
};

export function hasPermission(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
