"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import {
  signInAction,
  verifyMfaAction,
  type SignInState,
} from "@/lib/auth/actions";

/**
 * Staff sign-in. The credential exchange runs in a Server Action so it
 * can be rate-limited and audited (see src/lib/auth/actions.ts); this
 * component only collects input and renders the result.
 *
 * The `next` parameter is passed through untouched — the server
 * re-validates it with safeNextPath, because a value sanitised here
 * would be trivially bypassed by posting to the action directly.
 */
export function SignInForm({
  labels,
  locale,
}: {
  labels: {
    email: string;
    password: string;
    signIn: string;
    signingIn: string;
    genericError: string;
    mfaCode: string;
    verify: string;
  };
  locale: string;
}) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  const [signInState, submitSignIn, signInPending] = useActionState<
    SignInState | null,
    FormData
  >(signInAction, null);

  const [mfaState, submitMfa, mfaPending] = useActionState<
    SignInState | null,
    FormData
  >(verifyMfaAction, null);

  const needsMfa =
    signInState?.status === "mfa_required" ||
    mfaState?.status === "mfa_required";
  const pending = signInPending || mfaPending;
  const message = needsMfa ? mfaState?.message : signInState?.message;

  return (
    <form
      action={needsMfa ? submitMfa : submitSignIn}
      className="space-y-4"
      noValidate
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />

      {!needsMfa ? (
        <>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              {labels.email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-md border border-border bg-surface px-3 py-2"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              {labels.password}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-border bg-surface px-3 py-2"
            />
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="mfa-code" className="mb-1 block text-sm font-medium">
            {labels.mfaCode}
          </label>
          <input
            id="mfa-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            required
            className="w-full rounded-md border border-border bg-surface px-3 py-2 font-latin tracking-widest"
          />
        </div>
      )}

      {message ? (
        <p role="alert" className="text-sm text-down">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2 font-medium text-brand-contrast hover:bg-brand-strong disabled:opacity-60"
      >
        {pending
          ? labels.signingIn
          : needsMfa
            ? labels.verify
            : labels.signIn}
      </button>
    </form>
  );
}
