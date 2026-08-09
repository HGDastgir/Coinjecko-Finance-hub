"use client";

import { useActionState, useRef, useState } from "react";
import { saveArticle, type SaveResult } from "@/lib/content/editor-actions";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { resolveImageSrc } from "@/lib/content/media";
import { publicEnv } from "@/lib/env";
import {
  ARTICLE_TYPES,
  ARTICLE_TYPE_LABELS,
} from "@/lib/content/article-types";
import type { EditableArticle } from "@/lib/content/admin-content";
import { locales, localeDirection, type Locale } from "@/i18n/config";

/**
 * Create/edit form for one article and both of its translations.
 *
 * Admin surfaces stay English-only (see EditorialQueue) — the
 * bilingual requirement covers the public site. The Urdu *fields*
 * still render RTL with the Urdu font, because that is content being
 * authored, not chrome.
 *
 * Publication state is not editable here: the workflow buttons on the
 * overview own it, so a save can never sneak a draft onto the public
 * site.
 */

const FIELD =
  "mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm";
const LABEL = "block text-xs font-medium text-ink-muted";

function LocaleFields({
  locale,
  translation,
}: {
  locale: Locale;
  translation: EditableArticle["translations"][Locale];
}) {
  const dir = localeDirection[locale];
  const fontClass = locale === "ur" ? "" : "font-latin";
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  /** Splice `![](path)` in at the caret, on its own line. */
  function insertImage(path: string) {
    const node = bodyRef.current;
    if (!node) return;

    const snippet = `\n\n![](${path})\n\n`;
    const at = node.selectionStart ?? node.value.length;
    node.value =
      node.value.slice(0, at) + snippet + node.value.slice(node.selectionEnd ?? at);

    const caret = at + snippet.length;
    node.setSelectionRange(caret, caret);
    node.focus();
  }

  return (
    <fieldset className="rounded-lg border border-border bg-surface p-4">
      <legend className="px-1 text-sm font-semibold">
        {locale === "en" ? "English" : "Urdu"}
      </legend>

      <div className="space-y-3">
        <div>
          <label className={LABEL} htmlFor={`${locale}_title`}>
            Title
          </label>
          <input
            id={`${locale}_title`}
            name={`${locale}_title`}
            type="text"
            dir={dir}
            maxLength={300}
            defaultValue={translation?.title ?? ""}
            className={`${FIELD} ${fontClass}`}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor={`${locale}_slug`}>
            Slug — lowercase letters, numbers and hyphens
          </label>
          <input
            id={`${locale}_slug`}
            name={`${locale}_slug`}
            type="text"
            dir="ltr"
            inputMode="url"
            pattern="[a-z0-9-]+"
            maxLength={120}
            defaultValue={translation?.slug ?? ""}
            className={`${FIELD} font-latin`}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor={`${locale}_excerpt`}>
            Excerpt — shown on the blog index
          </label>
          <textarea
            id={`${locale}_excerpt`}
            name={`${locale}_excerpt`}
            dir={dir}
            rows={2}
            maxLength={600}
            defaultValue={translation?.excerpt ?? ""}
            className={`${FIELD} ${fontClass}`}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor={`${locale}_body`}>
            Body — plain text. Blank lines separate blocks. Use{" "}
            <code>## </code> for a heading, <code>### </code> for a
            sub-heading and <code>- </code> for bullets. HTML is not
            rendered.
          </label>
          <textarea
            id={`${locale}_body`}
            name={`${locale}_body`}
            ref={bodyRef}
            dir={dir}
            rows={14}
            maxLength={60000}
            defaultValue={translation?.body ?? ""}
            className={`${FIELD} ${fontClass}`}
          />
          {/* Inserts the image at the caret rather than appending, so
              artwork can land where the editor actually wants it. */}
          <div className="mt-2 rounded-md border border-border bg-canvas p-3">
            <ImageUploader
              label="Insert an image into the body"
              onUploaded={insertImage}
            />
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor={`${locale}_seo_title`}>
            SEO title (optional)
          </label>
          <input
            id={`${locale}_seo_title`}
            name={`${locale}_seo_title`}
            type="text"
            dir={dir}
            maxLength={200}
            defaultValue={translation?.seoTitle ?? ""}
            className={`${FIELD} ${fontClass}`}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor={`${locale}_seo_description`}>
            SEO description (optional)
          </label>
          <textarea
            id={`${locale}_seo_description`}
            name={`${locale}_seo_description`}
            dir={dir}
            rows={2}
            maxLength={400}
            defaultValue={translation?.seoDescription ?? ""}
            className={`${FIELD} ${fontClass}`}
          />
        </div>
      </div>
    </fieldset>
  );
}

export function ArticleEditor({
  locale,
  article,
  canPublish,
}: {
  locale: Locale;
  article: EditableArticle | null;
  /** Renders the publish button. The action re-checks server-side. */
  canPublish: boolean;
}) {
  const [state, formAction, isPending] = useActionState<
    SaveResult | null,
    FormData
  >(saveArticle, null);

  const [heroPath, setHeroPath] = useState(article?.heroImagePath ?? "");
  const heroPreview = resolveImageSrc(
    heroPath,
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  );

  const isPublished = article?.status === "published";
  // Only offer the public link once there is a public page to open.
  const slug = article?.translations[locale]?.slug;
  const liveHref = isPublished && slug ? `/${locale}/blog/${slug}` : null;

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {article ? (
        <input type="hidden" name="articleId" value={article.id} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="articleType">
            Type
          </label>
          <select
            id="articleType"
            name="articleType"
            defaultValue={article?.articleType ?? "market_update"}
            className={FIELD}
          >
            {ARTICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {ARTICLE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-muted">
            &ldquo;Breaking news&rdquo; also places the headline in the
            site-header strip once it is published.
          </p>
        </div>

        <div>
          <label className={LABEL} htmlFor="sponsorName">
            Sponsor — required for sponsored content
          </label>
          <input
            id="sponsorName"
            name="sponsorName"
            type="text"
            maxLength={200}
            defaultValue={article?.sponsorName ?? ""}
            className={FIELD}
          />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isSponsored"
              defaultChecked={article?.isSponsored ?? false}
              className="size-4"
            />
            This is sponsored content
          </label>
        </div>
      </div>

      {/* Hero image — one per article, shared across both languages,
          because the artwork is the same picture regardless of which
          translation a reader lands on. */}
      <fieldset className="rounded-lg border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold">Hero image</legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <ImageUploader label="Upload" onUploaded={setHeroPath} />
            <label className={`${LABEL} mt-3`} htmlFor="heroImagePath">
              Stored path, or an https:// URL
            </label>
            <input
              id="heroImagePath"
              name="heroImagePath"
              type="text"
              dir="ltr"
              maxLength={500}
              value={heroPath}
              onChange={(event) => setHeroPath(event.target.value)}
              className={`${FIELD} font-latin`}
            />
            {heroPath ? (
              <button
                type="button"
                onClick={() => setHeroPath("")}
                className="mt-2 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-surface-raised"
              >
                Remove image
              </button>
            ) : null}
          </div>

          <div>
            <span className={LABEL}>Preview</span>
            {heroPreview ? (
              /* Plain <img>: the preview shows exactly the bytes at
                 that URL, with no optimiser in between, which is what
                 an editor checking their upload wants to see. */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroPreview}
                alt=""
                className="mt-1 max-h-40 w-full rounded-md border border-border object-contain"
              />
            ) : (
              <p className="mt-1 rounded-md border border-dashed border-border p-4 text-xs text-ink-muted">
                No image set. The article renders without one.
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {locales.map((l) => (
          <LocaleFields
            key={l}
            locale={l}
            translation={article?.translations[l] ?? null}
          />
        ))}
      </div>

      {/* Two submit buttons, one form. `intent` tells the action which
          was pressed; the server re-checks the permission and the
          transition either way, so the buttons are a shortcut through
          the workflow rather than around it. */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        {canPublish ? (
          <button
            type="submit"
            name="intent"
            value="publish"
            disabled={isPending}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? "Working…"
              : isPublished
                ? "Save & keep published"
                : "Publish now"}
          </button>
        ) : null}

        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={isPending}
          className={
            canPublish
              ? "rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
              : "rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          }
        >
          {isPending ? "Saving…" : "Save draft"}
        </button>

        {liveHref ? (
          <a
            href={liveHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ink-muted underline hover:text-brand"
          >
            View on site ↗
          </a>
        ) : null}

        {state ? (
          <span
            role="status"
            className={`text-sm ${state.ok ? "text-up" : "text-down"}`}
          >
            {state.message}
          </span>
        ) : null}
      </div>

      {!canPublish ? (
        <p className="text-xs text-ink-muted">
          Your role saves drafts. An editor reviews and publishes them from
          the queue.
        </p>
      ) : null}
    </form>
  );
}
