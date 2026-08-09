/**
 * Article bodies are stored as PLAIN TEXT and must never be rendered
 * as HTML — the public CSP tier allows inline script, so stored markup
 * would turn an editor account into a scripting vector on a page that
 * cannot carry a nonce.
 *
 * A long explainer still needs structure, so the body supports a tiny,
 * fixed set of line prefixes. This parser turns them into a typed
 * block list; the page maps each block to a React element it creates
 * itself. Nothing from the database is ever interpreted as markup —
 * the worst a malicious body can do is choose which of these three
 * element types its own text appears in.
 *
 *   ## Heading            → level-2 heading
 *   ### Sub-heading       → level-3 heading
 *   - item                → bullet list (consecutive lines group)
 *   ![alt](path)          → image
 *   anything else         → paragraph
 *
 * Blank lines separate blocks, as before.
 *
 * The image form looks like Markdown but is NOT Markdown: only this
 * one shape is recognised, the captured path is resolved through
 * resolveImageSrc() at render time (which refuses anything that is not
 * https or a bucket-relative path), and the result is passed to a
 * React element. There is no path by which a body produces raw markup.
 */

export type RichTextBlock =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "image"; src: string; alt: string };

/** `![alt](path)` on a line of its own. */
const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

export function parseRichText(body: string): RichTextBlock[] {
  const blocks: RichTextBlock[] = [];

  for (const raw of body.split(/\r?\n\s*\r?\n/)) {
    const chunk = raw.trim();
    if (!chunk) continue;

    const lines = chunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    // A chunk of bullet lines becomes one list. Mixed chunks fall
    // through to the line-by-line pass below.
    if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
      blocks.push({
        kind: "list",
        items: lines.map((line) => line.slice(2).trim()),
      });
      continue;
    }

    for (const line of lines) {
      const image = IMAGE_LINE.exec(line);
      if (image) {
        blocks.push({ kind: "image", alt: image[1].trim(), src: image[2] });
      } else if (line.startsWith("### ")) {
        blocks.push({ kind: "heading", level: 3, text: line.slice(4).trim() });
      } else if (line.startsWith("## ")) {
        blocks.push({ kind: "heading", level: 2, text: line.slice(3).trim() });
      } else if (line.startsWith("- ")) {
        // A stray bullet inside a prose chunk: keep it a list of one
        // rather than printing the hyphen as content.
        blocks.push({ kind: "list", items: [line.slice(2).trim()] });
      } else {
        blocks.push({ kind: "paragraph", text: line });
      }
    }
  }

  return blocks;
}
