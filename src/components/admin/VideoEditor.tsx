"use client";

import { useActionState, useState } from "react";
import { saveVideo, type SaveResult } from "@/lib/content/editor-actions";
import {
  VideoUploader,
  type UploadedVideo,
} from "@/components/admin/VideoUploader";
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

/** Title → URL slug, matching the check constraint in migration 0002. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

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

  // Defaults to upload for new episodes: picking a file is the
  // common case now, and typing a path is the exception.
  // Title and slug are CONTROLLED, unlike the rest of the form.
  // useActionState re-renders on a failed submit, and an uncontrolled
  // input can lose what was typed — which is unforgivable here, where
  // the editor may have just waited out a 200 MB upload to reach the
  // error.
  const [title, setTitle] = useState(video?.title ?? "");
  const [slug, setSlug] = useState(video?.slug ?? "");
  // Once someone edits the slug by hand it stops tracking the title,
  // so a deliberate URL is never silently overwritten.
  const [slugTouched, setSlugTouched] = useState(Boolean(video?.slug));

  const [provider, setProvider] = useState(video?.provider || "upload");
  const [uploaded, setUploaded] = useState<UploadedVideo | null>(null);

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
          required
          maxLength={300}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
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
            required
            pattern="[a-z0-9-]+"
            maxLength={120}
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
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
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            className={FIELD}
          >
            <option value="upload">Upload from PC</option>
            <option value="youtube">YouTube</option>
            <option value="self_hosted">Self-hosted file</option>
          </select>
        </div>

        {/* The reference field is only meaningful for the two sources
            that need a hand-typed value. An upload has no reference to
            type — that is the point of it. */}
        {provider === "upload" ? null : (
          <div>
            <label className={LABEL} htmlFor="providerRef">
              {provider === "youtube"
                ? "YouTube video id — the dQw4w9WgXcQ part of the URL"
                : "Path on this site, e.g. /media/episode-1.mp4"}
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
        )}
      </div>

      {provider === "upload" ? (
        <>
          <VideoUploader
            current={video?.storagePath ?? ""}
            onUploaded={setUploaded}
          />
          {/* Carried as hidden fields so the save action records what
              was actually stored, rather than trusting a path the
              editor could have typed. Empty on edit-without-reupload,
              which the action reads as "keep the existing file". */}
          <input
            type="hidden"
            name="storagePath"
            value={uploaded?.storagePath ?? ""}
          />
          <input
            type="hidden"
            name="originalFilename"
            value={uploaded?.originalFilename ?? ""}
          />
          <input
            type="hidden"
            name="fileSizeBytes"
            value={uploaded ? String(uploaded.sizeBytes) : ""}
          />
          <input
            type="hidden"
            name="mimeType"
            value={uploaded?.mimeType ?? ""}
          />

          <div>
            <label className={LABEL} htmlFor="posterPath">
              Poster image path (optional) — shown before playback
            </label>
            <input
              id="posterPath"
              name="posterPath"
              type="text"
              dir="ltr"
              maxLength={500}
              defaultValue={video?.posterPath ?? ""}
              className={`${FIELD} font-latin`}
            />
            <p className="mt-1 text-xs text-ink-muted">
              An object key in the article-media bucket, or an https URL.
              Without one the player shows the first frame.
            </p>
          </div>
        </>
      ) : null}

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
