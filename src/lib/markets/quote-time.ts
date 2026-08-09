import type { Locale } from "@/i18n/config";

/**
 * Rendering a provider's quote timestamp.
 *
 * Always UTC, and always labelled as such. These pages are prerendered
 * and revalidated on a timer, so the server's own timezone is not a
 * meaningful frame of reference — and a build-machine local time
 * baked into the HTML would misstate how old a price is, which is
 * exactly the claim the honest-data rule cares about.
 *
 * Returns null for anything unparseable rather than "Invalid Date":
 * a quote whose age we cannot state is shown without an age.
 */
export function formatQuoteTime(
  iso: string | null | undefined,
  locale: Locale,
): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;

  return `${new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(parsed)} UTC`;
}
