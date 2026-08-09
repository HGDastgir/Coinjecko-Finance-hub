/**
 * Editorial image storage.
 *
 * Uploads go straight from the browser to Supabase Storage using the
 * signed-in user's own session, so the bucket policy from migration
 * 0008 decides what is allowed — an account without media.upload is
 * refused by the database, not by this file. Nothing here is a
 * security boundary; the checks exist to fail early with a message an
 * editor can act on, and to keep obviously wrong files off the wire.
 */

export const MEDIA_BUCKET = "article-media";

/** Mirrors the bucket's allowed_mime_types in migration 0008. */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

/** Mirrors the bucket's file_size_limit. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * A storage path that cannot collide and cannot escape the bucket.
 * The original filename is reduced to a short readable suffix rather
 * than trusted: it is user input, and it ends up in a URL.
 */
export function buildImagePath(originalName: string): string {
  const extension =
    /\.([a-z0-9]{2,5})$/i.exec(originalName)?.[1].toLowerCase() ?? "jpg";
  const stem =
    originalName
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "image";
  const now = new Date();
  const folder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${folder}/${Date.now()}-${stem}.${extension}`;
}

/** Public URL for a stored object. */
export function publicImageUrl(
  supabaseUrl: string,
  path: string,
): string {
  const clean = path.replace(/^\/+/, "");
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/${clean}`;
}

/**
 * Accepts a stored path OR an already-absolute URL and returns
 * something safe to put in an <img src>. Absolute URLs are limited to
 * https so a stored `javascript:` or `data:` value can never be
 * rendered as an image source.
 */
export function resolveImageSrc(
  value: string | null | undefined,
  supabaseUrl: string | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https:\/\//i.test(trimmed)) return trimmed;
  // Anything else carrying a scheme is rejected outright.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  if (trimmed.startsWith("//")) return null;

  if (!supabaseUrl) return null;
  return publicImageUrl(supabaseUrl, trimmed);
}

export function describeImageRejection(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "That file type is not allowed. Use JPEG, PNG, WebP, AVIF or GIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`;
  }
  return null;
}
