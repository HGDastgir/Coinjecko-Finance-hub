import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireSupabasePublicConfig } from "@/lib/env";

/**
 * Request-scoped Supabase client for Server Components, Server
 * Actions and Route Handlers. Uses the anon key — every query is
 * subject to Row-Level Security. Never use this for privileged
 * operations; see admin.ts.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = requireSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Session refresh is handled by the request proxy instead.
        }
      },
    },
  });
}
