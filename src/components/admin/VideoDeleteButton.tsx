"use client";

import { useActionState, useState } from "react";
import {
  deleteVideoRecord,
  type DeleteResult,
} from "@/lib/content/video-actions";
import type { Locale } from "@/i18n/config";

/**
 * Deletes a video record and its uploaded file.
 *
 * Two-step by design: deletion removes bytes from storage and cannot
 * be undone, so the first click only arms the real button. That is
 * cheaper than a modal and harder to hit by accident than a single
 * red button sitting next to "Edit".
 */
export function VideoDeleteButton({
  videoId,
  locale,
  title,
  hasFile,
}: {
  videoId: string;
  locale: Locale;
  title: string;
  hasFile: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [state, formAction, isPending] = useActionState<
    DeleteResult | null,
    FormData
  >(deleteVideoRecord, null);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-ink-muted hover:border-down hover:text-down"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="videoId" value={videoId} />
      <input type="hidden" name="locale" value={locale} />
      <span className="text-xs text-ink-muted">
        Delete “{title}”{hasFile ? " and its uploaded file" : ""}?
      </span>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-down px-2.5 py-1 text-xs font-semibold text-down hover:bg-down/10 disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="text-xs text-ink-muted underline"
      >
        Cancel
      </button>
      {state && !state.ok ? (
        <span role="status" className="text-xs text-down">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
