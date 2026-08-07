"use client";

import { useState } from "react";

/**
 * Currency converter. Talks only to our server-side /api/rates proxy
 * (provider keys never reach the browser). If the provider is
 * unreachable the API answers 503 and this shows the honest "not
 * connected" state — it never estimates a rate.
 *
 * The result carries the rate used and the provider's own update time,
 * because the free feed refreshes daily: presenting a day-old rate as
 * if it were live is exactly the kind of claim this project avoids.
 */
export function CurrencyConverter({
  currencies,
  labels,
}: {
  currencies: readonly string[];
  labels: {
    amount: string;
    from: string;
    to: string;
    convert: string;
    unavailable: string;
    rateNote: string;
  };
}) {
  const [amount, setAmount] = useState("100");
  const [base, setBase] = useState("USD");
  const [quote, setQuote] = useState("PKR");
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "unavailable" }
    | { kind: "error" }
    | {
        kind: "result";
        text: string;
        rate: number;
        asOf: string;
        source: string;
        pair: string;
      }
  >({ kind: "idle" });

  async function convert(event: React.FormEvent) {
    event.preventDefault();
    setState({ kind: "loading" });
    try {
      const params = new URLSearchParams({ base, quote, amount });
      const res = await fetch(`/api/rates?${params.toString()}`);
      if (res.status === 503) {
        setState({ kind: "unavailable" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "error" });
        return;
      }
      const data: {
        result?: number;
        rate?: number;
        asOf?: string;
        source?: string;
      } = await res.json();
      if (typeof data.result !== "number" || typeof data.rate !== "number") {
        setState({ kind: "error" });
        return;
      }
      const money = (value: number) =>
        new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: value < 1 ? 6 : 2,
        }).format(value);

      setState({
        kind: "result",
        text: `${money(Number(amount))} ${base} = ${money(data.result)} ${quote}`,
        rate: data.rate,
        asOf: data.asOf ?? "",
        source: data.source ?? "",
        pair: `1 ${base} = ${money(data.rate)} ${quote}`,
      });
    } catch {
      setState({ kind: "error" });
    }
  }

  const selectClass =
    "rounded-md border border-border bg-surface px-3 py-2 font-latin";

  return (
    <form
      onSubmit={convert}
      className="rounded-lg border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="cc-amount" className="mb-1 block text-sm font-medium">
            {labels.amount}
          </label>
          <input
            id="cc-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-32 rounded-md border border-border bg-surface px-3 py-2 font-latin tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="cc-from" className="mb-1 block text-sm font-medium">
            {labels.from}
          </label>
          <select
            id="cc-from"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className={selectClass}
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cc-to" className="mb-1 block text-sm font-medium">
            {labels.to}
          </label>
          <select
            id="cc-to"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            className={selectClass}
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={state.kind === "loading"}
          className="rounded-md bg-brand px-4 py-2 font-medium text-brand-contrast hover:bg-brand-strong disabled:opacity-60"
        >
          {labels.convert}
        </button>
      </div>

      <div aria-live="polite" className="mt-4 text-sm">
        {state.kind === "unavailable" || state.kind === "error" ? (
          <p className="rounded-md border border-dashed border-border p-3 text-ink-muted">
            {labels.unavailable}
          </p>
        ) : null}
        {state.kind === "result" ? (
          <div>
            <p className="font-latin text-lg font-semibold tabular-nums">
              {state.text}
            </p>
            <p className="mt-1 font-latin text-xs text-ink-muted tabular-nums">
              {state.pair}
            </p>
            {/* Provenance: whose rate, and how old. The free feed is
                daily, so this caveat is not decoration. */}
            <p className="mt-2 text-xs text-ink-muted">
              {labels.rateNote}
              {state.source ? ` — ${state.source}` : ""}
              {state.asOf ? ` · ${state.asOf}` : ""}
            </p>
          </div>
        ) : null}
      </div>
    </form>
  );
}
