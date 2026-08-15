"use client";

import { useEffect, useState } from "react";

/**
 * Copies a sender's address to the clipboard.
 *
 * The mailto: link beside this is the fast path, but it only works
 * when the operating system has a default mail handler — on a fresh
 * Windows install with webmail it does nothing at all, silently. This
 * is the fallback that always works, so replying never depends on a
 * setting nobody configured.
 */
export function CopyEmailButton({
  email,
  addressId,
}: {
  email: string;
  /**
   * id of the element showing the address. When both clipboard APIs
   * are refused, that element is selected so the "press Ctrl+C"
   * message is something the reader can actually act on rather than
   * advice with no selection behind it.
   */
  addressId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset the confirmation without leaking a timer if the row
  // unmounts (marking handled re-renders the list).
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  /**
   * The deprecated execCommand path, kept deliberately as a fallback.
   *
   * navigator.clipboard.writeText needs a secure context AND transient
   * user activation, and still returns NotAllowedError in situations
   * that look fine — observed here in a focused, secure page. This
   * older API has none of those conditions and is supported
   * everywhere, so it is what catches the cases the modern one drops.
   */
  function copyViaSelection(): boolean {
    const field = document.createElement("textarea");
    field.value = email;
    // Off-screen rather than display:none — a hidden field cannot be
    // selected, and an unstyled one would scroll the page on focus.
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "-1000px";
    field.style.opacity = "0";
    document.body.appendChild(field);
    try {
      field.select();
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      document.body.removeChild(field);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setFailed(false);
      setCopied(true);
      return;
    } catch {
      // Fall through — the older path may still succeed.
    }

    if (copyViaSelection()) {
      setFailed(false);
      setCopied(true);
      return;
    }

    // Never claim success we cannot verify. Select the address so the
    // keyboard instruction below is actionable.
    if (addressId) {
      const node = document.getElementById(addressId);
      const selection = window.getSelection();
      if (node && selection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    setFailed(true);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-ink-muted hover:bg-surface-raised"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      {/* Polite, not assertive: a copy confirmation should not
          interrupt whatever a screen reader is already saying. */}
      <span role="status" aria-live="polite" className="text-xs text-ink-muted">
        {copied ? "Address copied" : failed ? "Press Ctrl+C to copy" : ""}
      </span>
    </span>
  );
}
