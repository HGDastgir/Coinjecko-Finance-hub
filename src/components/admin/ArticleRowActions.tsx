"use client";

import { useActionState } from "react";
import { transitionArticle, type TransitionResult } from "@/lib/content/actions";
import type { Transition } from "@/lib/content/workflow";
import type { Locale } from "@/i18n/config";

/**
 * Workflow buttons for one article. Each button submits its target
 * status as the form value, so a row needs a single form regardless of
 * how many transitions the user is allowed. Rendering a button is only
 * a convenience — the action re-authorises every request server-side.
 */
export function ArticleRowActions({
  articleId,
  locale,
  transitions,
}: {
  articleId: string;
  locale: Locale;
  transitions: readonly Transition[];
}) {
  const [state, formAction, isPending] = useActionState<
    TransitionResult | null,
    FormData
  >(transitionArticle, null);

  if (transitions.length === 0) {
    return (
      <p className="text-xs text-ink-muted">No actions available to your role</p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="articleId" value={articleId} />
      <input type="hidden" name="locale" value={locale} />
      {transitions.map((transition) => (
        <button
          key={transition.to}
          type="submit"
          name="to"
          value={transition.to}
          disabled={isPending}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
        >
          {transition.label}
        </button>
      ))}
      {state ? (
        <span
          role="status"
          className={`text-xs ${state.ok ? "text-up" : "text-down"}`}
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
