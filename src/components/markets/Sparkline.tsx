"use client";

/**
 * 7-day price sparkline as inline SVG.
 *
 * Hand-rolled rather than pulling in a charting library: this is a
 * polyline over a normalised series, and the dependency tree is part
 * of the security posture.
 *
 * Purely decorative — it repeats the trend the adjacent 24h change
 * column already states in text, so it is hidden from assistive tech
 * rather than described. Colour follows the 7-day direction, never
 * the sole signal.
 */
export function Sparkline({
  series,
  width = 96,
  height = 28,
}: {
  series: readonly number[];
  width?: number;
  height?: number;
}) {
  if (series.length < 2) {
    return <span className="text-xs text-ink-muted">—</span>;
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;

  // A perfectly flat series would divide by zero; draw it mid-height.
  const y = (value: number) =>
    span === 0
      ? height / 2
      : height - 1 - ((value - min) / span) * (height - 2);

  const points = series
    .map((value, i) => {
      const x = (i / (series.length - 1)) * width;
      return `${x.toFixed(1)},${y(value).toFixed(1)}`;
    })
    .join(" ");

  const rose = series[series.length - 1] >= series[0];
  const stroke = rose ? "var(--up)" : "var(--down)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      focusable="false"
      className="overflow-visible"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
