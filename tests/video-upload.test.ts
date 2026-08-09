import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVideoStoragePath,
  describeVideoRejection,
  extensionOf,
  isAllowedVideoType,
} from "@/lib/content/video-upload";
import { resolveUploadedVideo } from "@/lib/content/video-embed";

const LIMIT = 200 * 1024 * 1024;
const UUID = "0f9d4c1e-6b2a-4a7d-9c3e-5b8f1a2d3e4f";

test("the three supported containers are accepted", () => {
  assert.equal(describeVideoRejection("clip.mp4", "video/mp4", 1000, LIMIT), null);
  assert.equal(describeVideoRejection("clip.webm", "video/webm", 1000, LIMIT), null);
  assert.equal(
    describeVideoRejection("clip.mov", "video/quicktime", 1000, LIMIT),
    null,
  );
});

/**
 * The point of the allow-list. An executable renamed to look like a
 * video, or a genuine executable, must never reach a bucket that is
 * served from a domain the browser trusts.
 */
test("executables and documents are refused", () => {
  for (const [name, type] of [
    ["payload.exe", "application/x-msdownload"],
    ["payload.sh", "text/x-shellscript"],
    ["page.html", "text/html"],
    ["vector.svg", "image/svg+xml"],
    ["archive.zip", "application/zip"],
    ["script.js", "text/javascript"],
  ] as const) {
    assert.notEqual(
      describeVideoRejection(name, type, 1000, LIMIT),
      null,
      `${name} should be refused`,
    );
  }
});

test("an executable disguised with a video extension is caught by its type", () => {
  const rejection = describeVideoRejection(
    "totally-a-movie.mp4",
    "application/x-msdownload",
    1000,
    LIMIT,
  );
  assert.notEqual(rejection, null);
});

test("a mismatched extension and content type is refused", () => {
  assert.notEqual(
    describeVideoRejection("clip.webm", "video/mp4", 1000, LIMIT),
    null,
  );
});

/**
 * Some Windows/browser combinations report no MIME type for .mov. The
 * extension has already been vetted, so the file is allowed through
 * and the bucket makes the final call — refusing here would block a
 * legitimate upload for a browser quirk.
 */
test("an empty content type falls back to the extension", () => {
  assert.equal(describeVideoRejection("clip.mov", "", 1000, LIMIT), null);
});

test("oversized and empty files are refused", () => {
  assert.notEqual(
    describeVideoRejection("clip.mp4", "video/mp4", LIMIT + 1, LIMIT),
    null,
  );
  assert.notEqual(describeVideoRejection("clip.mp4", "video/mp4", 0, LIMIT), null);
});

test("the limit is configurable downwards", () => {
  const tenMb = 10 * 1024 * 1024;
  assert.equal(
    describeVideoRejection("clip.mp4", "video/mp4", tenMb - 1, tenMb),
    null,
  );
  assert.notEqual(
    describeVideoRejection("clip.mp4", "video/mp4", tenMb + 1, tenMb),
    null,
  );
});

/**
 * The stored key is generated, never taken from the upload. A filename
 * carrying traversal or a second extension must not survive into it.
 */
test("the storage key is built from the uuid, not the filename", () => {
  const path = buildVideoStoragePath(extensionOf("../../etc/passwd.mp4"), UUID);
  assert.match(path, /^\d{4}-\d{2}\/[0-9a-f-]{36}\.mp4$/);
  assert.ok(!path.includes(".."));
  assert.ok(!path.includes("passwd"));
});

test("an unknown extension falls back rather than being interpolated", () => {
  const path = buildVideoStoragePath("php", UUID);
  assert.ok(path.endsWith(".mp4"), path);
});

test("isAllowedVideoType rejects anything outside the list", () => {
  assert.ok(isAllowedVideoType("video/mp4"));
  assert.ok(!isAllowedVideoType("video/x-msvideo"));
  assert.ok(!isAllowedVideoType("text/html"));
  assert.ok(!isAllowedVideoType(undefined));
});

/**
 * The public URL builder is the last gate before a value reaches a
 * <video src>. It must refuse anything that is not a plain object key.
 */
test("only a plain storage key resolves to a playable URL", () => {
  const ok = resolveUploadedVideo(
    `2026-08/${UUID}.mp4`,
    "https://proj.supabase.co",
  );
  assert.equal(
    ok?.src,
    `https://proj.supabase.co/storage/v1/object/public/video-media/2026-08/${UUID}.mp4`,
  );

  for (const hostile of [
    "../../../etc/passwd",
    "javascript:alert(1)",
    "https://evil.example/x.mp4",
    "//evil.example/x.mp4",
    "2026-08/../../secret.mp4",
  ]) {
    assert.equal(
      resolveUploadedVideo(hostile, "https://proj.supabase.co"),
      null,
      `should refuse: ${hostile}`,
    );
  }
});

test("no supabase url means no source, not a broken one", () => {
  assert.equal(resolveUploadedVideo(`2026-08/${UUID}.mp4`, undefined), null);
  assert.equal(resolveUploadedVideo(null, "https://proj.supabase.co"), null);
});
