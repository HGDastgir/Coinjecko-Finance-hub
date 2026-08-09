"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser, AuthorizationError } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEditableVideo } from "@/lib/content/admin-content";
import { writeAuditEvent } from "@/lib/audit";
import { defaultLocale, isLocale, locales } from "@/i18n/config";
import { logger } from "@/lib/logger";
import {
  buildVideoStoragePath,
  describeVideoRejection,
  extensionOf,
  maxUploadBytes,
  VIDEO_BUCKET,
} from "@/lib/content/video-upload";

/**
 * Upload tickets and deletion for video files.
 *
 * THE UPLOAD PATH, and why it is shaped like this:
 *
 * The browser never receives storage credentials and never talks to
 * our server with the file. Instead it asks this action for a ticket;
 * the action authenticates the caller, checks media.manage_video,
 * validates the declared filename/type/size, generates the object key
 * itself, and asks Storage — server-side — for a short-lived signed
 * upload URL scoped to that single key. The browser then PUTs the
 * bytes straight to Storage.
 *
 * The ticket is minted with the caller's OWN session, not the
 * service-role key. That is deliberate and stronger: the storage
 * policies from migration 0009 apply to the request that creates the
 * URL, so a caller who somehow got past the permission check above
 * would still be refused by the database. Using a key that bypasses
 * RLS would have made this action the only thing standing between a
 * bug and the bucket. It also means uploads need no extra secret to
 * be configured.
 *
 * That gets three things at once: the file never passes through a
 * serverless function (which caps request bodies at a few megabytes
 * and has an ephemeral filesystem), authorisation is decided by our
 * server rather than by the client, and the object key is ours rather
 * than derived from an attacker-controlled filename.
 *
 * The bucket's own policies and MIME allow-list from migration 0009
 * remain the final boundary: a forged ticket request still cannot put
 * an executable in the bucket.
 */

export interface UploadTicket {
  ok: true;
  /** Object key the caller must report back when saving the video. */
  path: string;
  /** One-time signed URL to PUT the bytes to. */
  uploadUrl: string;
}

export interface UploadTicketError {
  ok: false;
  message: string;
}

export async function createVideoUploadTicket(
  input: { filename: string; contentType: string; size: number },
): Promise<UploadTicket | UploadTicketError> {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { ok: false, message: "Sign-in required." };
    }
    throw err;
  }

  if (!hasPermission(user.role, "media.manage_video")) {
    logger.warn("media.upload_denied", { userId: user.id, role: user.role });
    return { ok: false, message: "Your role cannot upload videos." };
  }

  const filename = String(input.filename ?? "").slice(0, 300);
  const contentType = String(input.contentType ?? "").slice(0, 100);
  const size = Number(input.size);

  if (!Number.isFinite(size)) {
    return { ok: false, message: "Could not read the file size." };
  }

  // The same rule the browser applied, re-applied where it counts.
  const rejection = describeVideoRejection(
    filename,
    contentType,
    size,
    maxUploadBytes(),
  );
  if (rejection) return { ok: false, message: rejection };

  const path = buildVideoStoragePath(extensionOf(filename), randomUUID());

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.storage
      .from(VIDEO_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      logger.error("media.ticket_failed", { reason: error?.message });
      return {
        ok: false,
        message:
          "Could not start the upload. The storage backend refused the request.",
      };
    }

    logger.info("media.ticket_issued", {
      userId: user.id,
      path,
      size,
      contentType,
    });

    return { ok: true, path, uploadUrl: data.signedUrl };
  } catch (err) {
    logger.error("media.ticket_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    return {
      ok: false,
      message: "Could not start the upload. Please try again.",
    };
  }
}

export interface DeleteResult {
  ok: boolean;
  message: string;
}

/**
 * Delete a video record and, when it owns an uploaded file, the object
 * behind it. The object goes first: a row without its file shows a
 * broken player, while a file without its row is invisible but still
 * billed. Neither is good, but the orphan is the cheaper mistake to
 * discover, so the destructive step that can be retried runs first.
 */
export async function deleteVideoRecord(
  _prevState: DeleteResult | null,
  formData: FormData,
): Promise<DeleteResult> {
  const idInput = formData.get("videoId");
  const videoId = typeof idInput === "string" ? idInput : "";
  const localeInput = formData.get("locale");
  const uiLocale =
    typeof localeInput === "string" && isLocale(localeInput)
      ? localeInput
      : defaultLocale;

  if (!videoId) return { ok: false, message: "Missing video reference." };

  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { ok: false, message: "Sign-in required." };
    }
    throw err;
  }

  if (!hasPermission(user.role, "media.manage_video")) {
    return { ok: false, message: "Your role cannot delete videos." };
  }

  const existing = await getEditableVideo(videoId);
  if (!existing) {
    return { ok: false, message: "Video not found, or not visible to you." };
  }

  if (existing.storagePath) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.storage
        .from(VIDEO_BUCKET)
        .remove([existing.storagePath]);
      if (error) {
        // Report rather than press on: deleting the row here would
        // strand a file nobody can find or clean up.
        logger.error("media.object_delete_failed", {
          videoId,
          reason: error.message,
        });
        return {
          ok: false,
          message: "Could not remove the video file, so nothing was deleted.",
        };
      }
    } catch (err) {
      logger.error("media.object_delete_failed", {
        videoId,
        reason: err instanceof Error ? err.message : "unknown",
      });
      return {
        ok: false,
        message: "Could not remove the video file, so nothing was deleted.",
      };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("videos").delete().eq("id", videoId);

  if (error) {
    logger.error("media.delete_failed", { videoId, dbError: error.message });
    return {
      ok: false,
      message:
        "The file was removed but the database refused to delete the record.",
    };
  }

  const requestHeaders = await headers();
  await writeAuditEvent({
    actorId: user.id,
    action: "content.deleted",
    entity: "videos",
    entityId: videoId,
    metadata: { slug: existing.slug, storagePath: existing.storagePath },
    ip: requestHeaders.get("x-forwarded-for") ?? undefined,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  });

  revalidatePath(`/${uiLocale}/admin/videos`);
  for (const locale of locales) {
    revalidatePath(`/${locale}/vlogs`);
    revalidatePath(`/${locale}/vlogs/${existing.slug}`);
  }

  return { ok: true, message: "Video and its file were deleted." };
}
