"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { clientIpFromHeaders } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Contact form submission.
 *
 * A Server Action is a public POST endpoint, so this treats every
 * field as hostile: shape and length are validated server-side, the
 * sender is throttled by address, and the row is written with the
 * service-role client because migration 0005 grants no public INSERT
 * policy — there is deliberately no direct write path to the table.
 *
 * When Supabase is not configured the action says so and points the
 * reader at the email link, which is always rendered alongside the
 * form. It never pretends a message was delivered.
 */

const schema = z.object({
  topic: z.enum(["general", "advertising", "correction", "data_request"]),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
  // Honeypot: a real person never fills a hidden field.
  company: z.string().max(0).optional().or(z.literal("")),
});

export interface ContactState {
  status: "idle" | "sent" | "error" | "throttled" | "unavailable";
  message: string | null;
}

/** Stricter than the general API limit — this writes a row. */
const CONTACT_LIMIT = { limit: 3, windowMs: 10 * 60_000 };

export async function submitContactMessage(
  _previous: ContactState | null,
  formData: FormData,
): Promise<ContactState> {
  const parsed = schema.safeParse({
    topic: formData.get("topic"),
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
    company: formData.get("company") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the form and try again.",
    };
  }

  // Silently accept and discard honeypot hits: telling a bot it was
  // detected just teaches it to avoid the trap.
  if (parsed.data.company) {
    return { status: "sent", message: null };
  }

  const requestHeaders = await headers();
  const ip = clientIpFromHeaders((name) => requestHeaders.get(name));
  if (!rateLimit(`contact:${ip}`, CONTACT_LIMIT).success) {
    return {
      status: "throttled",
      message: "Too many messages sent. Please try again later.",
    };
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("contact_messages").insert({
      topic: parsed.data.topic,
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
      ip: ip === "unknown" ? null : ip,
      user_agent: requestHeaders.get("user-agent"),
    });

    if (error) {
      logger.error("contact.insert_failed", { dbError: error.message });
      return {
        status: "unavailable",
        message: null,
      };
    }

    return { status: "sent", message: null };
  } catch {
    // No Supabase configured, or it is unreachable.
    return { status: "unavailable", message: null };
  }
}
