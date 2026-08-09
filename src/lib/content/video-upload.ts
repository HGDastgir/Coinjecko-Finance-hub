/**
 * Rules for uploaded video files.
 *
 * These are stated once and enforced three times, deliberately:
 *
 *   1. in the browser, so a mistake costs no bandwidth
 *   2. in the server action that issues the upload ticket, because a
 *      Server Action is a public endpoint and the browser check is
 *      only a courtesy
 *   3. by the bucket itself (migration 0009), which is the boundary
 *      that actually holds if both of the above are bypassed
 *
 * The MIME allow-list is the security control. It admits three video
 * containers and nothing else — no HTML, no SVG, no scripts — so a
 * bucket served from a domain the browser trusts cannot be turned
 * into a delivery mechanism for executable content.
 */

export const VIDEO_BUCKET = "video-media";

/** Mirrors allowed_mime_types on the bucket in migration 0009. */
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type AllowedVideoType = (typeof ALLOWED_VIDEO_TYPES)[number];

/**
 * Extension per type. Browsers disagree about the MIME they report for
 * the same file — .mov arrives as video/quicktime on macOS and
 * sometimes as an empty string on Windows — so type and extension are
 * checked as a pair rather than trusting either alone.
 */
const EXTENSION_BY_TYPE: Record<AllowedVideoType, string[]> = {
  "video/mp4": ["mp4", "m4v"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov", "qt"],
};

export const ALLOWED_VIDEO_EXTENSIONS = Object.values(EXTENSION_BY_TYPE).flat();

/** The file picker's accept attribute. */
export const VIDEO_ACCEPT_ATTRIBUTE = [
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_VIDEO_EXTENSIONS.map((e) => `.${e}`),
].join(",");

/** Hard ceiling. The bucket enforces the same number. */
export const VIDEO_HARD_LIMIT_BYTES = 200 * 1024 * 1024;

/**
 * The configured ceiling, from NEXT_PUBLIC_VIDEO_MAX_UPLOAD_MB, capped
 * at the bucket's own limit — raising the env var past what Storage
 * accepts would only move the failure later, after the whole file had
 * been sent.
 */
export function maxUploadBytes(): number {
  const configured = Number(
    process.env.NEXT_PUBLIC_VIDEO_MAX_UPLOAD_MB ?? "",
  );
  if (!Number.isFinite(configured) || configured <= 0) {
    return VIDEO_HARD_LIMIT_BYTES;
  }
  return Math.min(configured * 1024 * 1024, VIDEO_HARD_LIMIT_BYTES);
}

export function isAllowedVideoType(value: unknown): value is AllowedVideoType {
  return (
    typeof value === "string" &&
    (ALLOWED_VIDEO_TYPES as readonly string[]).includes(value)
  );
}

export function extensionOf(filename: string): string {
  return /\.([A-Za-z0-9]{1,6})$/.exec(filename)?.[1].toLowerCase() ?? "";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * One rejection message, or null when the file is acceptable. Shared
 * so the browser and the server say exactly the same thing.
 */
export function describeVideoRejection(
  name: string,
  type: string,
  size: number,
  limit = maxUploadBytes(),
): string | null {
  const extension = extensionOf(name);

  if (!ALLOWED_VIDEO_EXTENSIONS.includes(extension)) {
    return `“.${extension || "?"}” is not a supported video file. Use MP4, WebM or MOV.`;
  }

  // An empty type happens on some Windows/browser combinations for
  // .mov. The extension has already been vetted, so it is allowed
  // through rather than blocking a legitimate file — the bucket still
  // checks the type it receives.
  if (type && !isAllowedVideoType(type)) {
    return `That file reports its type as “${type}”, which is not an allowed video format.`;
  }

  if (type && !EXTENSION_BY_TYPE[type as AllowedVideoType].includes(extension)) {
    return `The file extension (.${extension}) does not match its content type (${type}).`;
  }

  if (size <= 0) return "That file is empty.";

  if (size > limit) {
    return `That video is ${formatBytes(size)}. The limit is ${formatBytes(limit)}.`;
  }

  return null;
}

/**
 * Where the object lives. Generated on the SERVER from a random UUID,
 * never from the uploaded filename: the original name is attacker
 * controlled, ends up in a URL, and could otherwise traverse paths or
 * collide with an existing object. The real name is kept in the
 * database column instead, where it is data rather than a path.
 */
export function buildVideoStoragePath(
  extension: string,
  uuid: string,
): string {
  const now = new Date();
  const folder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const safeExtension = ALLOWED_VIDEO_EXTENSIONS.includes(extension)
    ? extension
    : "mp4";
  return `${folder}/${uuid}.${safeExtension}`;
}
