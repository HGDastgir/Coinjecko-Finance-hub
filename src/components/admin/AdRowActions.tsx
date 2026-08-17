"use client";

import { useActionState, useState } from "react";
import {
  setAdActive,
  deleteAd,
  type AdToggleResult,
} from "@/lib/content/ad-actions";

/**
 * Go-live / pause / delete for one campaign, from the list.
 *
 * Pause is deliberately a single click with no confirmation. It is the
 * action reached for under pressure — the wrong creative went live, or
 * an advertiser has asked to be pulled — it is instantly reversible,
 * and putting a confirmation in front of it would only add seconds
 * while something wrong is on every page.
 *
 * Delete is armed by a first click, the same as videos: it destroys a
 * booking record and cannot be undone. The audit row outlives it, but
 * the campaign itself does not.
 */
export function AdRowActions({
  adId,
  name,
  isActive,
}: {
  adId: string;
  name: string;
  isActive: boolean;
}) {
  const [toggleState, toggleAction, togglePending] = useActionState<
    AdToggleResult | null,
    FormData
  >(setAdActive, null);
  const [deleteState, deleteAction, deletePending] = useActionState<
    AdToggleResult | null,
    FormData
  >(deleteAd, null);
  const [armed, setArmed] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form action={toggleAction}>
        <input type="hidden" name="adId" value={adId} />
        <input type="hidden" name="active" value={String(!isActive)} />
        <button
          type="submit"
          disabled={togglePending}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
            isActive
              ? "border border-border text-ink-muted hover:bg-surface-raised"
              : "bg-brand text-brand-contrast hover:bg-brand-strong"
          }`}
        >
          {togglePending
            ? "Working…"
            : isActive
              ? "Pause"
              : "Publish"}
        </button>
      </form>

      {armed ? (
        <form action={deleteAction} className="flex items-center gap-2">
          <input type="hidden" name="adId" value={adId} />
          <span className="text-xs text-ink-muted">Delete “{name}”?</span>
          <button
            type="submit"
            disabled={deletePending}
            className="rounded-md border border-down px-2.5 py-1 text-xs font-semibold text-down hover:bg-down/10 disabled:opacity-50"
          >
            {deletePending ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="text-xs text-ink-muted underline"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-ink-muted hover:border-down hover:text-down"
        >
          Delete
        </button>
      )}

      {/* Failures only: a success re-renders the row, which is its own
          confirmation, but a refusal would otherwise be silent. */}
      {toggleState && !toggleState.ok ? (
        <span role="status" className="text-xs text-down">
          {toggleState.message}
        </span>
      ) : null}
      {deleteState && !deleteState.ok ? (
        <span role="status" className="text-xs text-down">
          {deleteState.message}
        </span>
      ) : null}
    </div>
  );
}
