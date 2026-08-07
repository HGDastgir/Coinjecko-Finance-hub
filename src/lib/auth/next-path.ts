import { isLocale, type Locale } from "@/i18n/config";

/**
 * Open-redirect guard for the `?next=` parameter on sign-in.
 *
 * The value arrives in a URL the attacker may have handed the victim,
 * so it is treated as hostile: only a same-site path inside the user's
 * own locale is accepted, and anything else falls back to the admin
 * home. Rejecting is always safe here — the worst case is landing on
 * /admin instead of the page you wanted.
 */

// Anything carrying a scheme is off-site by definition.
const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/** Control characters can split headers or confuse URL parsing. */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function safeNextPath(
  next: string | null | undefined,
  locale: Locale,
): string {
  const fallback = `/${locale}/admin`;
  if (!next || !isLocale(locale)) return fallback;

  // Backslashes are normalised to "/" by browsers, so "/en/\evil.com"
  // would slip past a naive prefix check.
  if (next.includes("\\")) return fallback;
  if (hasControlCharacter(next)) return fallback;

  // Protocol-relative and absolute URLs never match a locale prefix,
  // but check explicitly so the intent survives future edits.
  if (next.startsWith("//") || HAS_SCHEME.test(next)) return fallback;

  return next.startsWith(`/${locale}/`) ? next : fallback;
}
