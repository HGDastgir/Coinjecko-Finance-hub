"use client";

import { useActionState } from "react";
import {
  setMessageHandled,
  type InboxResult,
} from "@/lib/content/contact-inbox-actions";
import type { Locale } from "@/i18n/config";

/**
 * Toggles a message between the reply queue and the handled archive.
 *
 * No arming step, unlike video deletion: this destroys nothing and is
 * reversible from the same button, so a confirmation would be friction
 * without a payoff.
 */
export function MessageHandledButton({
  messageId,
  locale,
  handled,
}: {
  messageId: string;
  locale: Locale;
  handled: boolean;
}) {
  const [state, formAction, isPending] = useActionState<
    InboxResult | null,
    FormData
  >(setMessageHandled, null);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="messageId" value={messageId} />
      <input type="hidden" name="locale" value={locale} />
      {/* Present only when reopening — the action reads any other
          value, or none at all, as "mark handled". */}
      {handled ? <input type="hidden" name="handled" value="off" /> : null}
      <button
        type="submit"
        disabled={isPending}
        className={`rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
          handled
            ? "border-border text-ink-muted hover:bg-surface-raised"
            : "border-brand text-brand hover:bg-brand/10"
        }`}
      >
        {isPending
          ? "Saving…"
          : handled
            ? "Reopen"
            : "Mark handled"}
      </button>
      {state && !state.ok ? (
        <span role="status" className="text-xs text-down">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
