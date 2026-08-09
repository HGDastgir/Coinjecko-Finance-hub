"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasPermission, isRole, type Role } from "@/lib/auth/permissions";
import type { Locale } from "@/i18n/config";

/**
 * "Edit this page" bar for signed-in staff, on public pages.
 *
 * Why this is a CLIENT component and not a server check: the blog,
 * vlog and section pages are prerendered and revalidated on a timer.
 * Reading the session on the server would make every one of them
 * dynamic — a large, permanent cost to every reader, paid so that a
 * handful of editors can see one link. So the page stays static and
 * the bar resolves in the browser after hydration.
 *
 * It is presentation only. The link it renders goes to an admin route
 * that re-checks the session and the permission server-side, and every
 * write is gated again by row-level security. Someone forging the role
 * in devtools gets a link that refuses them at the other end.
 *
 * Renders nothing at all for signed-out readers, which is everyone
 * except the newsroom.
 */
export function StaffEditBar({
  locale,
  editPath,
  label,
}: {
  locale: Locale;
  /** Locale-less admin path, e.g. "/admin/articles/<id>". */
  editPath: string;
  label: string;
}) {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    let active = true;

    async function resolveRole() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !active) return;

        // RLS lets a user read their own profile and nothing else.
        const { data } = await supabase
          .from("profiles")
          .select("role, is_active")
          .eq("id", user.id)
          .single();

        if (!active || !data?.is_active) return;
        if (isRole(data.role)) setRole(data.role);
      } catch {
        // Signed out, offline, or Supabase unconfigured — all of which
        // mean the same thing here: show nothing.
      }
    }

    void resolveRole();
    return () => {
      active = false;
    };
  }, []);

  const canEditContent =
    hasPermission(role, "content.edit_any") ||
    hasPermission(role, "content.edit_own") ||
    hasPermission(role, "media.manage_video");

  if (!canEditContent) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-brand/40 bg-surface px-4 py-2 text-sm">
      <span className="font-semibold text-brand">{label}</span>
      <a
        href={`/${locale}${editPath}`}
        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-raised"
      >
        Edit ↗
      </a>
      <a
        href={`/${locale}/admin`}
        className="text-xs text-ink-muted underline hover:text-brand"
      >
        Admin
      </a>
    </div>
  );
}
