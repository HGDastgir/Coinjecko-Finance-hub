"use client";

import { useCallback, useRef } from "react";

/**
 * Pointer-driven tilt for the header poster.
 *
 * Writes two CSS custom properties and nothing else — the transform,
 * shadow and sheen all live in globals.css, so with JavaScript
 * unavailable the poster still renders at its resting angle instead of
 * flat. Fine-pointer only: on touch there is no hover state to follow,
 * and a tilt that fires on tap reads as a bug. `prefers-reduced-motion`
 * pins the angle in CSS, and this handler respects the same signal so
 * it does not fight it.
 */

const MAX_DEGREES = 5;

export function PosterTilt({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const reduced = useCallback(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const node = ref.current;
      if (!node || event.pointerType !== "mouse" || reduced()) return;

      const box = node.getBoundingClientRect();
      // −0.5 … 0.5 from the centre of the poster.
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;

      // The surface tips away from the cursor, as if pressed at that
      // point: pointer near the top edge (negative y) increases
      // rotateX, which sends the top further back. Same sign logic on
      // rotateY for the left/right edges.
      node.style.setProperty("--tilt-x", `${(-y * MAX_DEGREES).toFixed(2)}deg`);
      node.style.setProperty("--tilt-y", `${(x * MAX_DEGREES).toFixed(2)}deg`);
    },
    [reduced],
  );

  const reset = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  }, []);

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className="poster-3d relative overflow-hidden rounded-xl border border-border"
    >
      {children}
    </div>
  );
}
