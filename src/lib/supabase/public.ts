import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Anonymous, cookie-free Supabase client for published public content.
 *
 * Distinct from server.ts on purpose: that client reads the request's
 * cookies, which opts every page that touches it into dynamic
 * rendering. The blog, vlog and breaking-news surfaces show the same
 * published rows to everybody, so they must stay prerenderable and
 * revalidate on a timer instead.
 *
 * Still the anon key, so RLS decides what comes back — with no session
 * cookie the effective role is `anon`, which the 0002 policies limit to
 * published rows. Never use this for anything user-specific.
 *
 * Returns null when Supabase is not configured, so callers can show the
 * same honest gate the market surfaces use rather than an empty list
 * that reads as "nothing published".
 */
export function createSupabasePublicClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv;
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;

  return createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
