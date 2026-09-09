import test from "node:test";
import assert from "node:assert/strict";
import { parseAiResponse } from "../src/conversion/segments.mjs";
import { latexToMathMl } from "../src/conversion/mathml.mjs";
import { latexToOmml } from "../src/conversion/omml.mjs";
import { convertAiResponse } from "../src/index.mjs";
import { createDocx } from "../src/word-delivery/docx.mjs";
import { buildNotionClipboardHtml, buildNotionMarkdown } from "../src/word-delivery/clipboard-from-segments.mjs";

test("parses inline and display math in order", () => {
  const segments = parseAiResponse("A \\(x_1^2\\) B $$\\frac{a}{b}$$ C");
  assert.equal(segments.length, 5);
  assert.deepEqual(segments[1], { type: "math", latex: "x_1^2", display: false });
  assert.deepEqual(segments[3], { type: "math", latex: "\\frac{a}{b}", display: true });
});

test("converts fractions and scripts to MathML", () => {
  const mathMl = latexToMathMl({ latex: "\\frac{x_1^2}{y_2^3}", display: true });
  assert.match(mathMl, /<math/);
  assert.match(mathMl, /<mfrac>/);
  assert.match(mathMl, /<msubsup>/);
});

test("converts fractions and scripts to OMML", () => {
  const omml = latexToOmml({ latex: "\\frac{x_1^2}{y_2^3}", display: true });
  assert.match(omml, /<m:oMath>/);
  assert.match(omml, /<m:f>/);
  assert.match(omml, /<m:sSubSup>/);
});

test("creates a docx zip payload", () => {
  const segments = convertAiResponse("Inline \\(\\mu_x = \\frac{p_y}{p_x} - 6\\).");
  const docx = createDocx(segments);
  assert.equal(docx.readUInt32LE(0), 0x04034b50);
  assert.ok(docx.length > 500);
});

test("converts matrices to MathML and OMML", () => {
  const latex = "\\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}";
  assert.match(latexToMathMl({ latex, display: true }), /<mtable>/);
  assert.match(latexToOmml({ latex, display: true }), /<m:m>/);
});

test("builds a simpler Notion clipboard output that reads like editable text", () => {
  const segments = convertAiResponse("# Notes\n\n- Energy is $E=mc^2$.\n\n```js\nconst x = 1;\n```\n\n$$\\frac{a}{b}$$");
  const markdown = buildNotionMarkdown(segments);
  const html = buildNotionClipboardHtml(segments);

  assert.match(markdown, /^Notes/);
  assert.doesNotMatch(markdown, /^#/m);
  assert.doesNotMatch(markdown, /```|\$\$|\$E=mc\^2\$/);
  assert.match(markdown, /E=mc\^2/);
  assert.match(markdown, /\\frac\{a\}\{b\}/);
  assert.doesNotMatch(html, /data-equation|<pre>|<code/);
  assert.match(html, /Notes/);
  assert.match(html, /Energy is<span>E=mc\^2<\/span>\./);
});
