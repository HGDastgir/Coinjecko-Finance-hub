"use client";

import { useEffect, useRef } from "react";

/**
 * One AdSense display unit.
 *
 * The push that asks Google to fill the slot happens in an effect
 * rather than an inline <script> — the public CSP tier allows inline
 * script today, but relying on that for our own code would make the
 * ad integration the reason we could never tighten it.
 *
 * Guarded against double-push: React strict mode runs effects twice in
 * development, and AdSense throws "All ins elements already have ads"
 * when the same slot is pushed again, which surfaces as a console
 * error and an unfilled slot.
 */
export function AdUnit({
  client,
  slotId,
}: {
  client: string;
  slotId: string;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      const w = window as typeof window & { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle ?? [];
      w.adsbygoogle.push({});
    } catch {
      // A blocked or failed loader must never break the page around
      // it; the reserved space simply stays empty.
    }
  }, []);

  return (
    <ins
      className="adsbygoogle block w-full"
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
