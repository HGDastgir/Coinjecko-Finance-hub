/**
 * Turning a stored `provider` + `provider_ref` into something we are
 * willing to put in the DOM.
 *
 * The reference is editor-supplied, so it is validated against the
 * provider's own id format rather than interpolated on trust — an
 * unchecked value would be an open redirect at best and an arbitrary
 * iframe source at worst. Anything that does not match returns null and
 * the UI says the episode has no playable source, which is true.
 *
 * YouTube is embedded through youtube-nocookie.com, the only external
 * frame origin allowed by the CSP (src/lib/security/headers.ts) — the
 * two must change together.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,32}$/;
/** Self-hosted files are served from our own origin only. */
const LOCAL_PATH = /^\/[A-Za-z0-9._~\-/]+$/;

export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

export type PlayableSource =
  | { kind: "youtube"; embedUrl: string; watchUrl: string }
  | { kind: "file"; src: string };

export function resolveVideoSource(
  provider: string | null,
  providerRef: string | null,
): PlayableSource | null {
  if (!provider || !providerRef) return null;

  if (provider === "youtube") {
    if (!YOUTUBE_ID.test(providerRef)) return null;
    return {
      kind: "youtube",
      embedUrl: `${YOUTUBE_EMBED_ORIGIN}/embed/${providerRef}`,
      watchUrl: `https://www.youtube.com/watch?v=${providerRef}`,
    };
  }

  if (provider === "self_hosted") {
    if (!LOCAL_PATH.test(providerRef) || providerRef.includes("..")) {
      return null;
    }
    return { kind: "file", src: providerRef };
  }

  return null;
}
