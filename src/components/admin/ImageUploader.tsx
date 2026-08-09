"use client";

import { useId, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  buildImagePath,
  describeImageRejection,
  MEDIA_BUCKET,
} from "@/lib/content/media";

/**
 * Uploads an image to the editorial bucket and hands the stored path
 * back to the caller.
 *
 * The upload uses the editor's own session, so the storage policy from
 * migration 0008 is what actually authorises it — a role without
 * media.upload gets refused by the database and sees that here as a
 * plain error. The type and size checks below are a courtesy: they
 * catch the common mistake before a 5 MB round trip, and the bucket
 * enforces the same two limits regardless.
 */
export function ImageUploader({
  onUploaded,
  label,
}: {
  onUploaded: (path: string) => void;
  label: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);

    const rejection = describeImageRejection(file);
    if (rejection) {
      setError(rejection);
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const path = buildImagePath(file.name);
      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        // The most common cause by far is a role without media.upload,
        // which surfaces as a policy violation rather than a 403.
        setError(
          /policy|denied|unauthor/i.test(uploadError.message)
            ? "Upload refused: your role does not hold media.upload."
            : uploadError.message,
        );
        return;
      }

      onUploaded(path);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label
        className="block text-xs font-medium text-ink-muted"
        htmlFor={inputId}
      >
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
        className="mt-1 block w-full text-sm file:me-3 file:rounded-md file:border file:border-border file:bg-surface-raised file:px-3 file:py-1.5 file:text-sm file:text-ink disabled:opacity-50"
      />
      <p className="mt-1 text-xs text-ink-muted">
        {busy ? "Uploading…" : "JPEG, PNG, WebP, AVIF or GIF. Up to 5 MB."}
      </p>
      {error ? (
        <p role="status" className="mt-1 text-xs text-down">
          {error}
        </p>
      ) : null}
    </div>
  );
}
