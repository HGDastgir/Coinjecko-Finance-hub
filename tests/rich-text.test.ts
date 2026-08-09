import test from "node:test";
import assert from "node:assert/strict";
import { parseRichText } from "@/lib/content/rich-text";

/**
 * Article bodies are stored as plain text. This parser is the only
 * thing that gives them structure, so the rule it must never break is
 * that no input produces markup — every block carries TEXT, and the
 * page decides which element renders it.
 */

test("plain prose becomes paragraphs, split on blank lines", () => {
  const blocks = parseRichText("First para.\n\nSecond para.");
  assert.deepEqual(blocks, [
    { kind: "paragraph", text: "First para." },
    { kind: "paragraph", text: "Second para." },
  ]);
});

test("hash prefixes become headings at the right level", () => {
  const blocks = parseRichText("## Top\n\n### Sub\n\nBody.");
  assert.deepEqual(blocks, [
    { kind: "heading", level: 2, text: "Top" },
    { kind: "heading", level: 3, text: "Sub" },
    { kind: "paragraph", text: "Body." },
  ]);
});

test("consecutive bullet lines group into one list", () => {
  const blocks = parseRichText("- one\n- two\n- three");
  assert.deepEqual(blocks, [
    { kind: "list", items: ["one", "two", "three"] },
  ]);
});

test("separate bullet chunks stay separate lists", () => {
  const blocks = parseRichText("- a\n\nProse.\n\n- b");
  assert.deepEqual(blocks, [
    { kind: "list", items: ["a"] },
    { kind: "paragraph", text: "Prose." },
    { kind: "list", items: ["b"] },
  ]);
});

test("a heading immediately followed by bullets keeps both", () => {
  const blocks = parseRichText("## Assets\n\n- Bitcoin\n- Ethereum");
  assert.deepEqual(blocks, [
    { kind: "heading", level: 2, text: "Assets" },
    { kind: "list", items: ["Bitcoin", "Ethereum"] },
  ]);
});

test("a stray bullet inside prose does not print its hyphen", () => {
  const blocks = parseRichText("Intro line\n- lone bullet");
  assert.deepEqual(blocks, [
    { kind: "paragraph", text: "Intro line" },
    { kind: "list", items: ["lone bullet"] },
  ]);
});

test("empty and whitespace-only input yields no blocks", () => {
  assert.deepEqual(parseRichText(""), []);
  assert.deepEqual(parseRichText("   \n\n  \t \n\n"), []);
});

test("windows line endings parse the same as unix", () => {
  assert.deepEqual(
    parseRichText("## Title\r\n\r\n- one\r\n- two"),
    parseRichText("## Title\n\n- one\n- two"),
  );
});

test("an image line becomes an image block with its alt text", () => {
  assert.deepEqual(parseRichText("![Gold bars](2026-08/gold.jpg)"), [
    { kind: "image", alt: "Gold bars", src: "2026-08/gold.jpg" },
  ]);
});

test("an image with empty alt is still an image", () => {
  assert.deepEqual(parseRichText("![](2026-08/chart.png)"), [
    { kind: "image", alt: "", src: "2026-08/chart.png" },
  ]);
});

test("images sit alongside prose without swallowing it", () => {
  assert.deepEqual(
    parseRichText("Intro.\n\n![a](x.png)\n\n## After"),
    [
      { kind: "paragraph", text: "Intro." },
      { kind: "image", alt: "a", src: "x.png" },
      { kind: "heading", level: 2, text: "After" },
    ],
  );
});

/**
 * The image syntax is not Markdown and must not drift into it. A
 * partial or inline form stays text, so a stray bracket in prose can
 * never silently become an element.
 */
test("only a complete image line on its own is treated as an image", () => {
  for (const notAnImage of [
    "![alt](",
    "see ![alt](x.png) inline",
    "![alt] (x.png)",
    "!alt(x.png)",
  ]) {
    const [block] = parseRichText(notAnImage);
    assert.equal(block.kind, "paragraph", `should stay text: ${notAnImage}`);
  }
});

/**
 * The security property, stated as a test: a body full of markup is
 * carried as literal text. Nothing in the output is ever a raw HTML
 * string for a caller to inject.
 */
test("markup in the body is carried as text, never as structure", () => {
  const hostile =
    "<script>alert(1)</script>\n\n## <img src=x onerror=alert(1)>\n\n- <b>bold</b>";
  const blocks = parseRichText(hostile);

  assert.deepEqual(blocks, [
    { kind: "paragraph", text: "<script>alert(1)</script>" },
    { kind: "heading", level: 2, text: "<img src=x onerror=alert(1)>" },
    { kind: "list", items: ["<b>bold</b>"] },
  ]);

  // Only the three known kinds exist; there is no "html" escape hatch.
  for (const block of blocks) {
    assert.ok(["paragraph", "heading", "list"].includes(block.kind));
  }
});
