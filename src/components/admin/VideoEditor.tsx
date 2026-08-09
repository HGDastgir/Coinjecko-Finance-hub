"use client";

import { useActionState } from "react";
import { saveVideo, type SaveResult } from "@/lib/content/editor-actions";
import type { EditableVideo } from "@/lib/content/admin-content";
import { locales, type Locale } from "@/i18n/config";

/**
 * Create/edit form for one vlog episode.
 *
 * Videos have no review workflow in the schema — `media.manage_video`
 * is the whole gate — so this form carries a plain publish checkbox
 * rather than the article transition buttons. The provider reference is
 * validated server-side against the provider's id format before it is
 * ever put in an iframe.
 */

const FIELD =
  "mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm";
const LABEL = "block text-xs font-medium text-ink-muted";

export function VideoEditor({
  locale,
  video,
}: {
  locale: Locale;
  video: EditableVideo | null;
}) {
  const [state, formAction, isPending] = useActionState<
    SaveResult | null,
    FormData
  >(saveVideo, null);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {video ? <input type="hidden" name="videoId" value={video.id} /> : null}

      <div>
        <label className={LABEL} htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={300}
          defaultValue={video?.title ?? ""}
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="slug">
            Slug — lowercase letters, numbers and hyphens
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            dir="ltr"
            pattern="[a-z0-9-]+"
            maxLength={120}
            defaultValue={video?.slug ?? ""}
            className={`${FIELD} font-latin`}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="contentLocale">
            Language of the episode
          </label>
          <select
            id="contentLocale"
            name="contentLocale"
            defaultValue={video?.locale ?? "en"}
            className={FIELD}
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {l === "en" ? "English" : "Urdu"}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink-muted">
            The episode appears only on the vlog page for this language.
          </p>
        </div>
      </div>

      <div>
        <label className={LABEL} htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={video?.description ?? ""}
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="provider">
            Source
          </label>
          <select
            id="provider"
            name="provider"
            defaultValue={video?.provider ?? "youtube"}
            className={FIELD}
          >
            <option value="youtube">YouTube</option>
            <option value="self_hosted">Self-hosted file</option>
          </select>
        </div>

        <div>
          <label className={LABEL} htmlFor="providerRef">
            Reference — YouTube video id, or a path like
            /media/episode-1.mp4
          </label>
          <input
            id="providerRef"
            name="providerRef"
            type="text"
            dir="ltr"
            maxLength={300}
            defaultValue={video?.providerRef ?? ""}
            className={`${FIELD} font-latin`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="durationSeconds">
            Duration in seconds (optional)
          </label>
          <input
            id="durationSeconds"
            name="durationSeconds"
            type="number"
            min={0}
            step={1}
            defaultValue={video?.durationSeconds ?? ""}
            className={`${FIELD} font-latin`}
          />
        </div>

        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isShort"
              defaultChecked={video?.isShort ?? false}
              className="size-4"
            />
            This is a short
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="publish"
              defaultChecked={video?.status === "published"}
              className="size-4"
            />
            Published — visible on the public vlog page
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving…" : video ? "Save changes" : "Add video"}
        </button>
        {state ? (
          <span
            role="status"
            className={`text-sm ${state.ok ? "text-up" : "text-down"}`}
          >
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
