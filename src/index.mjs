import { createRequire } from "node:module";
import { extractFromText } from "./source-extractors/manual-text.js";
import { escapeXml } from "./conversion/segments.mjs";
import { latexToMathMl as fallbackLatexToMathMl } from "./conversion/mathml.mjs";
import { latexToOmml as fallbackLatexToOmml } from "./conversion/omml.mjs";

const require = createRequire(import.meta.url);
const primaryConversion = require("./conversion/index.js");

export function convertAiResponse(input) {
  const { segments, warnings = [] } = extractFromText(input);
  const converted = segments.map((segment) => {
    if (segment.type === "text") return segment;

    try {
      const mathMl = primaryConversion.latexToMathMl({
        latex: segment.latex,
        display: segment.display
      });
      return {
        ...segment,
        mathMl,
        omml: primaryConversion.mathMlToOmml(mathMl),
        conversionEngine: "mathjax-primary"
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ...segment,
        mathMl: fallbackLatexToMathMl(segment),
        omml: fallbackLatexToOmml(segment),
        conversionEngine: "codex-fallback",
        conversionWarning: message
      };
    }
  });

  Object.defineProperty(converted, "warnings", {
    value: warnings,
    enumerable: false
  });

  return converted;
}

export function segmentsToHtml(segments) {
  const body = segments
    .map((segment) => {
      if (segment.type === "text") {
        return escapeXml(segment.value)
          .split(/\n{2,}/)
          .map((part) => `<p>${part.replaceAll("\n", "<br>")}</p>`)
          .join("\n");
      }
      return segment.display
        ? `<div class="math-display">${segment.mathMl}</div>`
        : `<span class="math-inline">${segment.mathMl}</span>`;
    })
    .join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>AI Word Math Bridge Output</title>
  <style>
    body { font-family: Cambria, "Times New Roman", serif; line-height: 1.45; max-width: 760px; margin: 40px auto; padding: 0 20px; }
    .math-display { margin: 18px 0; text-align: center; }
    .math-inline { display: inline-block; vertical-align: middle; }
    .toolbar { display: flex; gap: 8px; margin-bottom: 20px; }
    button { font: inherit; padding: 8px 12px; }
  </style>
</head>
<body>
  <div class="toolbar">
    <button id="copy">Copy Rich HTML</button>
    <button id="select">Select Content</button>
  </div>
  <main id="content">
${body}
  </main>
  <script>
    const content = document.getElementById("content");
    document.getElementById("select").addEventListener("click", () => {
      const range = document.createRange();
      range.selectNodeContents(content);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    document.getElementById("copy").addEventListener("click", async () => {
      const html = content.innerHTML;
      if (navigator.clipboard && window.ClipboardItem) {
        const blob = new Blob([html], { type: "text/html" });
        await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
        return;
      }
      const range = document.createRange();
      range.selectNodeContents(content);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("copy");
    });
  </script>
</body>
</html>`;
}

export function segmentsToPlainText(segments) {
  return segments
    .map((segment) => (segment.type === "text" ? segment.value : segment.latex))
    .join("");
}
