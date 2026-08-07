/**
 * Sliding-window rate limiter.
 *
 * The in-memory store is per server instance and resets on deploy —
 * adequate for development and as a defence-in-depth backstop, but
 * production abuse protection must come from the CDN/WAF layer and,
 * for distributed limits, a durable store (e.g. Upstash Redis via
 * UPSTASH_REDIS_REST_URL). The call signature is store-agnostic so
 * the backend can be swapped without touching call sites.
 */

interface Window {
  timestamps: number[];
}

const store = new Map<string, Window>();
let lastPrune = Date.now();

const MAX_KEYS = 50_000; // hard cap so the map cannot grow unbounded

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Milliseconds until the oldest counted request leaves the window. */
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();

  // Opportunistic pruning keeps memory bounded without a timer.
  if (now - lastPrune > windowMs && store.size > 1_000) {
    for (const [k, w] of store) {
      if (w.timestamps.length === 0 || now - w.timestamps.at(-1)! > windowMs) {
        store.delete(k);
      }
    }
    lastPrune = now;
  }
  if (store.size >= MAX_KEYS && !store.has(key)) {
    // Fail open for new keys rather than letting memory grow unbounded;
    // the WAF/CDN layer remains the primary flood control.
    return { success: true, limit, remaining: 1, retryAfterMs: 0 };
  }

  const win = store.get(key) ?? { timestamps: [] };
  win.timestamps = win.timestamps.filter((t) => now - t < windowMs);

  if (win.timestamps.length >= limit) {
    store.set(key, win);
    return {
      success: false,
      limit,
      remaining: 0,
      retryAfterMs: windowMs - (now - win.timestamps[0]),
    };
  }

  win.timestamps.push(now);
  store.set(key, win);
  return {
    success: true,
    limit,
    remaining: limit - win.timestamps.length,
    retryAfterMs: 0,
  };
}

/** Standard limits used across the app. */
export const RATE_LIMITS = {
  api: { limit: 120, windowMs: 60_000 },
  auth: { limit: 10, windowMs: 60_000 },
  newsletter: { limit: 5, windowMs: 60_000 },
} as const;
