import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isContactTopic, type ContactTopic } from "@/lib/content/contact-topics";

/**
 * Staff-side reads for the contact inbox.
 *
 * Deliberately the RLS-bound request client, not the service role.
 * Migration 0005 grants SELECT only to holders of users.manage, so the
 * database is what decides whether these rows come back — the page
 * below merely renders whatever survives that check. Reading a
 * stranger's name, email and IP is exactly the kind of access that
 * should never depend on a UI-side `if`.
 *
 * `null` means the backend is unreachable, which the inbox reports as
 * such rather than showing an empty list that reads as "no messages".
 */

export {
  CONTACT_TOPICS,
  TOPIC_LABELS,
  isContactTopic,
  type ContactTopic,
} from "@/lib/content/contact-topics";

export interface ContactMessage {
  id: string;
  topic: ContactTopic;
  name: string;
  email: string;
  message: string;
  userAgent: string | null;
  handledAt: string | null;
  handledBy: string | null;
  createdAt: string;
}

interface ContactRow {
  id: string;
  topic: string;
  name: string;
  email: string;
  message: string;
  user_agent: string | null;
  handled_at: string | null;
  handled_by: string | null;
  created_at: string;
}

/**
 * `ip` is intentionally absent from the select.
 *
 * The column exists for abuse tracing, which is an audit-log question
 * asked rarely and deliberately — not something to print beside every
 * message where it becomes ambient knowledge. Narrowing the select is
 * also the cheapest way to keep it out of the server/client payload.
 */
const SELECT =
  "id, topic, name, email, message, user_agent, handled_at, handled_by, created_at";

function toMessage(row: ContactRow): ContactMessage {
  return {
    id: row.id,
    // An unrecognised enum value means the database moved ahead of this
    // build. Fall back rather than crash the whole inbox over one row.
    topic: isContactTopic(row.topic) ? row.topic : "general",
    name: row.name,
    email: row.email,
    message: row.message,
    userAgent: row.user_agent,
    handledAt: row.handled_at,
    handledBy: row.handled_by,
    createdAt: row.created_at,
  };
}

export interface ContactInbox {
  messages: ContactMessage[];
  unhandled: number;
}

export async function listContactMessages(
  limit = 200,
): Promise<ContactInbox | null> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv;
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("contact_messages")
      .select(SELECT)
      // Unhandled first, then newest — the reply queue, not an archive.
      .order("handled_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn("contact.list_failed", { dbError: error.message });
      return null;
    }

    const messages = ((data ?? []) as unknown as ContactRow[]).map(toMessage);
    return {
      messages,
      unhandled: messages.filter((m) => m.handledAt === null).length,
    };
  } catch (err) {
    logger.warn("contact.list_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

/**
 * Count of unread messages, for the nav badge.
 *
 * A HEAD count rather than fetching rows: the badge renders on every
 * admin page, and it has no business pulling names and addresses
 * across the wire to display a number.
 */
export async function countUnhandledMessages(): Promise<number> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = publicEnv;
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) return 0;

  try {
    const supabase = await createSupabaseServerClient();
    const { count, error } = await supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .is("handled_at", null);

    if (error) {
      logger.warn("contact.count_failed", { dbError: error.message });
      return 0;
    }
    return count ?? 0;
  } catch {
    // A badge is not worth failing a page render over.
    return 0;
  }
}
