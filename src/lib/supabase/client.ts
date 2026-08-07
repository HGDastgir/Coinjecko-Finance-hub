"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "@/lib/env";

/**
 * Browser Supabase client (anon key only — protected by RLS).
 * Used by interactive auth flows (sign-in, MFA challenge).
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = requireSupabasePublicConfig();
  return createBrowserClient(url, anonKey);
}
