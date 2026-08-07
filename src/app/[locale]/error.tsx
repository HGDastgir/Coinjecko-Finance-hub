"use client";

import { useEffect } from "react";

/**
 * Route error boundary. Never leaks stack traces or internal error
 * detail to the user; the digest is logged for correlation with
 * server logs.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        msg: "route_error_boundary",
        digest: error.digest ?? null,
      }),
    );
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">
        Something went wrong · کچھ غلط ہو گیا
      </h1>
      <p className="mt-2 text-ink-muted">
        The error has been logged. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-md bg-brand px-4 py-2 text-brand-contrast hover:bg-brand-strong"
      >
        Try again · دوبارہ کوشش کریں
      </button>
    </div>
  );
}
