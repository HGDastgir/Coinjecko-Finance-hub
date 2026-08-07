import { z } from "zod";

/**
 * Environment access with validation.
 *
 * - `publicEnv` — NEXT_PUBLIC_* values, safe in the browser.
 * - `serverEnv()` — secrets, lazily validated. Import only from
 *   server code. Server-only secrets are intentionally optional at
 *   parse time so the app can build without credentials; call sites
 *   must use the `require*` helpers which fail loudly when a secret
 *   is genuinely needed.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .transform((u) => u.replace(/\/+$/, "")),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  MARKET_DATA_API_KEY: z.string().min(1).optional(),
  CRYPTO_DATA_API_KEY: z.string().min(1).optional(),
  FOREX_DATA_API_KEY: z.string().min(1).optional(),
  ECONOMIC_CALENDAR_API_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must never be called in the browser");
  }
  if (!cached) cached = serverSchema.parse(process.env);
  return cached;
}

/** Fails loudly when a secret is required but missing. */
export function requireServerSecret(name: keyof ServerEnv): string {
  const value = serverEnv()[name];
  if (!value) {
    throw new Error(
      `Missing required server secret "${name}". Set it in .env.local (see .env.example).`,
    );
  }
  return value;
}

export function requireSupabasePublicConfig(): {
  url: string;
  anonKey: string;
} {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv;
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  return {
    url: NEXT_PUBLIC_SUPABASE_URL,
    anonKey: NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
