"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";

/**
 * Switches locale while preserving the current path
 * (/en/markets → /ur/markets). Rendered as a link so crawlers can
 * discover both language versions.
 */
export function LocaleSwitcher({
  currentLocale,
  label,
  ariaLabel,
}: {
  currentLocale: Locale;
  label: string;
  ariaLabel: string;
}) {
  const pathname = usePathname() ?? `/${currentLocale}`;
  const other: Locale =
    locales.find((l) => l !== currentLocale) ?? currentLocale;

  const segments = pathname.split("/");
  segments[1] = other;
  const target = segments.join("/") || `/${other}`;

  return (
    <Link
      href={target}
      lang={other}
      aria-label={ariaLabel}
      className="rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-raised"
    >
      {label}
    </Link>
  );
}
