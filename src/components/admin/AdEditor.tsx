"use client";

import { useActionState, useState } from "react";
import { saveAd, type AdSaveResult } from "@/lib/content/ad-actions";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { AD_SCOPES } from "@/content/ad-targeting";
import { AD_KINDS, AD_PLACEMENTS } from "@/content/ad-placements";
import type { AdminAd } from "@/lib/content/admin-ads";
import { locales, type Locale } from "@/i18n/config";

/**
 * Book or edit one advertising campaign.
 *
 * The form is arranged as the three questions a booking actually
 * answers — what it is, where it runs, when it runs — rather than in
 * column order, because "where it runs" is the part that gets a
 * campaign billed and invisible when it is wrong.
 *
 * Nothing here is a security boundary: the action re-validates every
 * field and the database CHECK constraints from migration 0011 are the
 * final word. These inputs exist to make the valid choice the easy one.
 */

const FIELD =
  "mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm";
const LABEL = "block text-xs font-medium text-ink-muted";

/**
 * ISO timestamp → the "YYYY-MM-DDTHH:mm" a datetime-local input wants.
 * Sliced from the ISO string rather than read through local getters,
 * so the value shown is the UTC the action stored and not a figure
 * shifted by the booker's timezone.
 */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 16);
}

export function AdEditor({
  locale,
  ad,
}: {
  locale: Locale;
  ad: AdminAd | null;
}) {
  const [state, formAction, isPending] = useActionState<
    AdSaveResult | null,
    FormData
  >(saveAd, null);

  // Controlled, like the article and video editors: useActionState
  // re-renders on a failed submit and uncontrolled inputs can lose
  // what was typed.
  const [name, setName] = useState(ad?.name ?? "");
  const [kind, setKind] = useState<string>(ad?.kind ?? "direct");
  const [targetUrl, setTargetUrl] = useState(ad?.targetUrl ?? "");
  const [imagePath, setImagePath] = useState(ad?.imagePath ?? "");
  const [imageAlt, setImageAlt] = useState(ad?.imageAlt ?? "");

  const needsDestination = kind !== "adsense";

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {ad ? <input type="hidden" name="adId" value={ad.id} /> : null}

      {/* ---------- What ---------- */}
      <fieldset className="space-y-4 rounded-lg border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold">The campaign</legend>

        <div>
          <label className={LABEL} htmlFor="name">
            Campaign name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={FIELD}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Internal only — readers never see it. Something you will
            recognise in six months, like “Meezan Bank — Q3 leaderboard”.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="kind">
              Type
            </label>
            <select
              id="kind"
              name="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              className={FIELD}
            >
              {Object.entries(AD_KINDS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="label">
              Disclosure label
            </label>
            <input
              id="label"
              name="label"
              type="text"
              maxLength={60}
              defaultValue={ad?.label ?? "Advertisement"}
              className={FIELD}
            />
            <p className="mt-1 text-xs text-ink-muted">
              Shown above the creative. It is not optional — every paid
              placement is labelled.
            </p>
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="targetUrl">
            Destination URL {needsDestination ? "" : "(not used by AdSense)"}
          </label>
          <input
            id="targetUrl"
            name="targetUrl"
            type="url"
            inputMode="url"
            placeholder="https://example.com/landing"
            maxLength={2000}
            required={needsDestination}
            value={targetUrl}
            onChange={(event) => setTargetUrl(event.target.value)}
            className={FIELD}
          />
          <p className="mt-1 text-xs text-ink-muted">
            https only. The link is tagged rel=&ldquo;sponsored&rdquo; and
            opens in a new tab, and the reader&rsquo;s current page is not
            passed to the advertiser.
          </p>
        </div>

        <div>
          <ImageUploader
            label="Creative"
            onUploaded={(path) => setImagePath(path)}
          />
          <input type="hidden" name="imagePath" value={imagePath} />
          {imagePath ? (
            <p className="mt-1 break-all font-latin text-xs text-ink-muted">
              {imagePath}{" "}
              <button
                type="button"
                onClick={() => setImagePath("")}
                className="ms-1 underline"
              >
                remove
              </button>
            </p>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">
              Optional. Without one the slot shows the campaign name as
              text. Creatives are hosted here, not hot-linked from the
              advertiser.
            </p>
          )}
        </div>

        {imagePath ? (
          <div>
            <label className={LABEL} htmlFor="imageAlt">
              Alt text
            </label>
            <input
              id="imageAlt"
              name="imageAlt"
              type="text"
              required
              maxLength={200}
              value={imageAlt}
              onChange={(event) => setImageAlt(event.target.value)}
              className={FIELD}
            />
            <p className="mt-1 text-xs text-ink-muted">
              What the creative says, for readers using a screen reader.
            </p>
          </div>
        ) : null}
      </fieldset>

      {/* ---------- Where ---------- */}
      <fieldset className="space-y-4 rounded-lg border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold">Where it runs</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="placement">
              Placement
            </label>
            <select
              id="placement"
              name="placement"
              defaultValue={ad?.placement ?? "top-leaderboard"}
              className={FIELD}
            >
              {Object.entries(AD_PLACEMENTS).map(([value, format]) => (
                <option key={value} value={value}>
                  {value} ({format})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="pageScope">
              Pages
            </label>
            <select
              id="pageScope"
              name="pageScope"
              defaultValue={ad?.pageScope ?? ""}
              className={FIELD}
            >
              {AD_SCOPES.map((scope) => (
                <option key={scope.value ?? "all"} value={scope.value ?? ""}>
                  {scope.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-ink-muted">
          A placement is a position; the pages setting narrows which pages
          it runs on. “Every page” means every page that carries that
          position — some positions only exist on article or vlog pages, so
          the two settings work together.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="adLocale">
              Language edition
            </label>
            <select
              id="adLocale"
              name="adLocale"
              defaultValue={ad?.locale ?? ""}
              className={FIELD}
            >
              <option value="">Both editions</option>
              {locales.map((code) => (
                <option key={code} value={code}>
                  {code === "ur" ? "Urdu only" : "English only"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="priority">
              Priority
            </label>
            <input
              id="priority"
              name="priority"
              type="number"
              min={0}
              max={100}
              step={1}
              defaultValue={ad?.priority ?? 0}
              className={FIELD}
            />
            <p className="mt-1 text-xs text-ink-muted">
              0–100. When two campaigns want the same slot the higher
              number wins; ties go to the more specific booking.
            </p>
          </div>
        </div>
      </fieldset>

      {/* ---------- When ---------- */}
      <fieldset className="space-y-4 rounded-lg border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold">When it runs</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="startsAt">
              Starts
            </label>
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={toLocalInput(ad?.startsAt ?? null)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="endsAt">
              Ends
            </label>
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              defaultValue={toLocalInput(ad?.endsAt ?? null)}
              className={FIELD}
            />
          </div>
        </div>

        <p className="text-xs text-ink-muted">
          Both times are <strong>UTC</strong>, not your local clock, so a
          flight booked from Karachi and one booked from London mean the
          same thing. Leave either blank for open-ended.
        </p>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={ad?.isActive ?? false}
            className="size-4"
          />
          Live — publish this campaign to the site
        </label>
        <p className="text-xs text-ink-muted">
          Unchecked, the campaign is saved but renders nowhere. Publishing
          refreshes every cached page, so it appears within seconds rather
          than whenever each page happens to expire.
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-strong disabled:opacity-50"
        >
          {isPending ? "Saving…" : ad ? "Save campaign" : "Create campaign"}
        </button>
        {state ? (
          <p
            role="status"
            className={`text-sm ${state.ok ? "text-up" : "text-down"}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
