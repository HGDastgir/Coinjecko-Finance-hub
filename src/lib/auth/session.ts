import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  hasPermission,
  isRole,
  type Permission,
  type Role,
} from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";

export interface CurrentUser {
  id: string;
  email: string | null;
  role: Role | null;
  displayName: string | null;
  isActive: boolean;
}

/**
 * Resolve the authenticated user and their profile/role.
 * Uses supabase.auth.getUser() (verifies the JWT with the auth
 * server) — never trust getSession() alone for authorisation.
 * Wrapped in React cache() so one request = one lookup.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name, is_active")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      email: user.email ?? null,
      role: profile && isRole(profile.role) ? profile.role : null,
      displayName: profile?.display_name ?? null,
      isActive: profile?.is_active ?? false,
    };
  } catch (err) {
    logger.warn("auth.getCurrentUser failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
});

export class AuthorizationError extends Error {
  constructor(message = "Not authorised") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Throws unless a signed-in, active user exists. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !user.isActive) throw new AuthorizationError("Sign-in required");
  return user;
}

/** Throws unless the user holds the given permission. */
export async function requirePermission(
  permission: Permission,
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) {
    logger.warn("auth.permission_denied", {
      userId: user.id,
      permission,
      role: user.role,
    });
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
  return user;
}
