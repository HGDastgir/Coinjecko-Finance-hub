import type { Locale } from "@/i18n/config";

/**
 * Publication dates are rendered in UTC on purpose. These pages are
 * prerendered and revalidated on a timer, so "the server's local time"
 * is not a meaningful frame of reference, and a build-machine timezone
 * leaking into the HTML would show readers a date that quietly differs
 * from the one the newsroom recorded.
 */
export function formatPublishedDate(
  iso: string | null,
  locale: Locale,
): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

/** `<time datetime>` needs the machine-readable form, not the pretty one. */
export function toDateAttribute(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/** Seconds → m:ss, for video durations. */
export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds < 0) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
