"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | null;

/**
 * Theme override: system preference by default (pure CSS), explicit
 * choice stored in localStorage and applied to <html data-theme>.
 * localStorage is treated as an external store (useSyncExternalStore)
 * so SSR renders the neutral state and the client syncs after
 * hydration. No inline scripts — keeps the nonce-based CSP strict.
 */

const THEME_EVENT = "app:themechange";

function subscribe(callback: () => void): () => void {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Theme {
  const stored = window.localStorage.getItem("theme");
  return stored === "light" || stored === "dark" ? stored : null;
}

function getServerSnapshot(): Theme {
  return null;
}

export function ThemeToggle({ label }: { label: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Effect only synchronizes the external system (the <html> element).
  useEffect(() => {
    if (theme) {
      document.documentElement.dataset.theme = theme;
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, [theme]);

  function toggle() {
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const current: Theme = theme ?? (systemDark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    window.localStorage.setItem("theme", next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-raised"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
