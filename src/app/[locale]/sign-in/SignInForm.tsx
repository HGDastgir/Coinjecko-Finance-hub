"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Staff sign-in. Credentials go directly from the browser to
 * Supabase Auth over TLS — they never touch our own API routes or
 * logs. Progressive server-side protections (lockout, anomaly
 * detection) live in Supabase Auth settings; MFA verification is
 * enforced for privileged roles.
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function safeNextPath(): string {
    // Open-redirect guard: only same-site, same-locale paths.
    const next = searchParams.get("next") ?? "";
    return next.startsWith(`/${locale}/`) ? next : `/${locale}/admin`;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();

    try {
      if (!needsMfa) {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          // Generic message: never reveal whether the account exists.
          setError(labels.genericError);
          return;
        }
        const { data: aal } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (
          aal?.nextLevel === "aal2" &&
          aal.nextLevel !== aal.currentLevel
        ) {
          setNeedsMfa(true);
          return;
        }
        router.replace(safeNextPath());
        router.refresh();
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (!totp) {
        setError(labels.genericError);
        return;
      }
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (challengeError || !challenge) {
        setError(labels.genericError);
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totp.id,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (verifyError) {
        setError(labels.genericError);
        return;
      }
      router.replace(safeNextPath());
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {!needsMfa ? (
        <>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              {labels.email}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            required
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 font-latin tracking-widest"
          />
        </div>
      )}

      {error ? (
        <p role="alert" className="text-sm text-down">
          {error}
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
