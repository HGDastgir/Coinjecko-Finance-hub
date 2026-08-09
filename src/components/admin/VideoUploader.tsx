"use client";

import { useRef, useState } from "react";
import { createVideoUploadTicket } from "@/lib/content/video-actions";
import {
  describeVideoRejection,
  formatBytes,
  maxUploadBytes,
  VIDEO_ACCEPT_ATTRIBUTE,
} from "@/lib/content/video-upload";

/**
 * Picks a video from the machine and uploads it straight to Storage.
 *
 * XMLHttpRequest rather than fetch, for one reason: fetch cannot
 * report upload progress. On a 200 MB file over a domestic connection
 * that is the difference between a usable form and one that looks
 * frozen for four minutes.
 *
 * The bytes never touch our server. The action returns a signed URL
 * scoped to a single object key and this PUTs to it directly, so the
 * serverless body limit and its ephemeral filesystem are both out of
 * the path — see video-actions.ts.
 */

type Phase =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uploading"; percent: number }
  | { kind: "done" }
  | { kind: "error"; message: string };

export interface UploadedVideo {
  storagePath: string;
  originalFilename: string;
  sizeBytes: number;
  mimeType: string;
}

export function VideoUploader({
  onUploaded,
  current,
}: {
  onUploaded: (file: UploadedVideo | null) => void;
  /** Already-stored object key, when editing. */
  current: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [selected, setSelected] = useState<{
    name: string;
    size: number;
  } | null>(null);

  function reset() {
    xhrRef.current?.abort();
    xhrRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
    setSelected(null);
    setPhase({ kind: "idle" });
    onUploaded(null);
  }

  async function upload(file: File) {
    setSelected({ name: file.name, size: file.size });
    onUploaded(null);

    const rejection = describeVideoRejection(file.name, file.type, file.size);
    if (rejection) {
      setPhase({ kind: "error", message: rejection });
      return;
    }

    setPhase({ kind: "checking" });

    const ticket = await createVideoUploadTicket({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    });

    if (!ticket.ok) {
      setPhase({ kind: "error", message: ticket.message });
      return;
    }

    setPhase({ kind: "uploading", percent: 0 });

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("PUT", ticket.uploadUrl, true);
        if (file.type) xhr.setRequestHeader("content-type", file.type);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          setPhase({
            kind: "uploading",
            percent: Math.round((event.loaded / event.total) * 100),
          });
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(
                new Error(
                  xhr.status === 413
                    ? "Storage rejected the file as too large."
                    : `Storage returned ${xhr.status}.`,
                ),
              );
        xhr.onerror = () =>
          reject(new Error("The connection dropped during upload."));
        xhr.onabort = () => reject(new Error("Upload cancelled."));
        xhr.send(file);
      });

      setPhase({ kind: "done" });
      onUploaded({
        storagePath: ticket.path,
        originalFilename: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
      });
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : "Upload failed.",
      });
    } finally {
      xhrRef.current = null;
    }
  }

  const busy = phase.kind === "checking" || phase.kind === "uploading";

  return (
    <div className="rounded-lg border border-border bg-canvas p-4">
      <p className="text-xs font-medium text-ink-muted">Video file</p>

      {current && phase.kind === "idle" && !selected ? (
        <p className="mt-1 text-xs text-ink-muted">
          A file is already attached:{" "}
          <span className="font-latin break-all">{current}</span>. Choosing a
          new one replaces it when you save.
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          Choose Video from PC
        </button>

        {busy ? (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-ink-muted underline hover:text-brand"
          >
            Cancel
          </button>
        ) : null}

        {!busy && (selected || current) ? (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-ink-muted underline hover:text-brand"
          >
            Clear
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {selected ? (
        <p className="mt-2 break-all text-xs text-ink-muted">
          <span className="font-latin">{selected.name}</span>
          {" — "}
          <span className="font-latin">{formatBytes(selected.size)}</span>
        </p>
      ) : null}

      {phase.kind === "uploading" ? (
        <div className="mt-2">
          {/* Native progress element: it is announced by screen
              readers and styled by the platform, which beats a div
              pretending to be a bar. */}
          <progress
            value={phase.percent}
            max={100}
            className="h-2 w-full"
            aria-label="Upload progress"
          />
          <p className="mt-1 font-latin text-xs text-ink-muted">
            Uploading… {phase.percent}%
          </p>
        </div>
      ) : null}

      {phase.kind === "checking" ? (
        <p className="mt-2 text-xs text-ink-muted">Authorising upload…</p>
      ) : null}

      {phase.kind === "done" ? (
        <p role="status" className="mt-2 text-xs text-up">
          Uploaded. Save the form to attach it to this episode.
        </p>
      ) : null}

      {phase.kind === "error" ? (
        <p role="status" className="mt-2 text-xs text-down">
          {phase.message}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-ink-muted">
        MP4, WebM or MOV, up to {formatBytes(maxUploadBytes())}.
      </p>
    </div>
  );
}
