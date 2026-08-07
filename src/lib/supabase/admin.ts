import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireServerSecret, requireSupabasePublicConfig } from "@/lib/env";

/**
 * Service-role client. BYPASSES Row-Level Security.
 *
 * Rules of use:
 * - server code only (the "server-only" import makes client-side
 *   imports a build error)
 * - never handed to request handlers that echo data back without
 *   explicit field selection
 * - reserved for: audit logging, admin workflows that have already
 *   passed a permission check, and system jobs
 */
export function createSupabaseAdminClient() {
  const { url } = requireSupabasePublicConfig();
  const serviceRoleKey = requireServerSecret("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
