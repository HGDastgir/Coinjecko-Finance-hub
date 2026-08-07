import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Application-level audit trail (complements the tamper-resistant
 * database triggers in supabase/migrations/0001).
 *
 * Rules:
 * - append-only: the audit_log table forbids UPDATE/DELETE at the
 *   database level, even for the service role
 * - metadata must never contain secrets or full personal records;
 *   the logger's redaction is a backstop, not an excuse
 * - audit failures are logged but never crash the calling request
 */

export type AuditAction =
  | "auth.sign_in"
  | "auth.sign_out"
  | "auth.sign_in_failed"
  | "auth.mfa_enrolled"
  | "content.created"
  | "content.updated"
  | "content.deleted"
  | "content.published"
  | "permission.changed"
  | "user.created"
  | "user.deactivated"
  | "api_config.changed"
  | "advertisement.changed"
  | "newsletter.exported";

export interface AuditEvent {
  actorId: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function writeAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("audit_log").insert({
      actor_id: event.actorId,
      action: event.action,
      entity: event.entity,
      entity_id: event.entityId ?? null,
      metadata: event.metadata ?? {},
      ip: event.ip ?? null,
      user_agent: event.userAgent ?? null,
    });
    if (error) {
      logger.error("audit.write_failed", { action: event.action, dbError: error.message });
    }
  } catch (err) {
    logger.error("audit.write_failed", {
      action: event.action,
      reason: err instanceof Error ? err.message : "unknown",
    });
  }
}
