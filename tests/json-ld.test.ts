import test from "node:test";
import assert from "node:assert/strict";
import { serializeJsonLd } from "@/lib/seo/json-ld";

/**
 * JSON-LD is injected with dangerouslySetInnerHTML, so a "<" that
 * survives serialization is a script-breakout. The CSP does not help
 * here: the payload would land inside an already-trusted inline block.
 */

test("a </script> in the data cannot break out of the block", () => {
  const output = serializeJsonLd({
    "@context": "https://schema.org",
    headline: '</script><img src=x onerror="alert(1)">',
  });

  assert.ok(!output.includes("</script>"), "raw </script> survived");
  assert.ok(!output.includes("<"), "raw < survived");
  assert.ok(output.includes("\\u003c"), "expected < to be escaped as \\u003c");
});

test("escaping survives a round trip through JSON.parse", () => {
  const headline = '</script><b>bold</b>';
  const parsed = JSON.parse(serializeJsonLd({ headline })) as {
    headline: string;
  };

  assert.equal(
    parsed.headline,
    headline,
    "escaping must not corrupt the value a consumer reads back",
  );
});

test("nested and array values are escaped too", () => {
  const output = serializeJsonLd({
    author: { name: "<script>x</script>" },
    tags: ["<a>", "<b>"],
  });

  assert.ok(!output.includes("<"));
});

test("ordinary content is left readable", () => {
  const output = serializeJsonLd({ headline: "KSE-100 rises 1.2%" });
  assert.ok(output.includes("KSE-100 rises 1.2%"));
});
