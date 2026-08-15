"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser, AuthorizationError } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientIpFromHeaders } from "@/lib/security/client-ip";
import { writeAuditEvent } from "@/lib/audit";
import { defaultLocale, isLocale, locales } from "@/i18n/config";
import { logger } from "@/lib/logger";

/**
 * Marks a contact message handled, or puts it back in the queue.
 *
 * A Server Action is a public POST endpoint, so the session is
 * re-read here and users.manage re-checked — the fact that the button
 * only renders inside the admin shell proves nothing about who is
 * calling it. The UPDATE policy from migration 0005 enforces the same
 * rule underneath, so a mistake in this file cannot widen access.
 *
 * Marking handled writes an audit event because it is the record of
 * who took responsibility for answering a member of the public.
 */

export interface InboxResult {
  ok: boolean;
  message: string;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setMessageHandled(
  _previous: InboxResult | null,
  formData: FormData,
): Promise<InboxResult> {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { ok: false, message: "Sign-in required." };
    }
    throw err;
  }

  if (!hasPermission(user.role, "users.manage")) {
    logger.warn("contact.handle_denied", { userId: user.id, role: user.role });
    return { ok: false, message: "Your role cannot manage messages." };
  }

  const messageId = String(formData.get("messageId") ?? "");
  if (!UUID.test(messageId)) {
    return { ok: false, message: "That message id is not valid." };
  }

  // Absent means "mark handled"; the reopen button sends handled=off.
  const handled = formData.get("handled") !== "off";

  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("contact_messages")
      .update({
        handled_at: handled ? new Date().toISOString() : null,
        handled_by: handled ? user.id : null,
      })
      .eq("id", messageId);

    if (error) {
      logger.warn("contact.handle_failed", { dbError: error.message });
      return {
        ok: false,
        message: "The message could not be updated. Please try again.",
      };
    }
  } catch (err) {
    logger.warn("contact.handle_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return { ok: false, message: "The messages backend is not reachable." };
  }

  const requestHeaders = await headers();
  const ip = clientIpFromHeaders((name) => requestHeaders.get(name));
  await writeAuditEvent({
    actorId: user.id,
    action: handled ? "contact.marked_handled" : "contact.reopened",
    entity: "contact_messages",
    entityId: messageId,
    ip: ip === "unknown" ? undefined : ip,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  });

  // The unread badge sits in the admin layout, so every admin page
  // carries a copy of the count — refresh the whole admin subtree.
  for (const l of locales) {
    revalidatePath(`/${l}/admin`, "layout");
  }
  revalidatePath(`/${locale}/admin/messages`);

  return {
    ok: true,
    message: handled ? "Marked handled." : "Moved back to the queue.",
  };
}
