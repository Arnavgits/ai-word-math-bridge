/**
 * Clipboard prototype: write HTML containing embedded MathML for Word paste.
 *
 * Strategy (validated by EquaPaste and Microsoft MathML interop notes):
 *   - text/html  → bare Presentation MathML (<math xmlns="...">) inside a minimal HTML fragment
 *   - text/plain → optional fallback (LaTeX or raw MathML)
 *
 * Avoid OMML inside HTML on the clipboard — Word writes OMML outbound but does not
 * reliably import OMML from third-party HTML paste payloads.
 */

const MATHML_NS = "http://www.w3.org/1998/Math/MathML";

/** @typedef {{ type: "text"; value: string } | { type: "math"; mathml: string; display?: boolean }} DocumentSegment */

/**
 * Build a minimal HTML document fragment containing prose and MathML segments.
 * @param {DocumentSegment[]} segments
 * @returns {string}
 */
export function buildHtmlWithMathML(segments) {
  const bodyParts = segments.map((seg) => {
    if (seg.type === "text") {
      return escapeHtml(seg.value).replace(/\n/g, "<br/>");
    }
    const displayAttr = seg.display ? ' display="block"' : "";
    const inner = seg.mathml.replace(/^<math[^>]*>/, "").replace(/<\/math>$/, "");
    return `<math xmlns="${MATHML_NS}"${displayAttr}>${inner}</math>`;
  });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${bodyParts.join("")}</body></html>`;
}

/**
 * Build a plain-text fallback from segments (LaTeX delimiters preserved when provided).
 * @param {DocumentSegment[]} segments
 * @returns {string}
 */
export function buildPlainTextFallback(segments) {
  return segments
    .map((seg) => {
      if (seg.type === "text") return seg.value;
      const latex = seg.latex ?? seg.mathml;
      return seg.display ? `\n$$${latex}$$\n` : `$${latex}$`;
    })
    .join("");
}

/**
 * Wrap HTML for legacy CF_HTML clipboard format (Windows Word interop).
 * @param {string} html
 * @returns {string}
 */
export function wrapCfHtml(html) {
  const startHtml = "<html>";
  const startFragment = "<!--StartFragment-->";
  const endFragment = "<!--EndFragment-->";
  const endHtml = "</html>";

  const fragmentStart = html.indexOf("<body>");
  const fragmentEnd = html.indexOf("</body>") + "</body>".length;
  const fragment = html.slice(fragmentStart, fragmentEnd);

  const wrapped =
    startHtml +
    "<head><meta charset=\"utf-8\"></head>" +
    startFragment +
    fragment +
    endFragment +
    endHtml;

  const header =
    "Version:0.9\r\n" +
    `StartHTML:${String(wrapped.indexOf(startHtml)).padStart(10, "0")}\r\n` +
    `EndHTML:${String(wrapped.length).padStart(10, "0")}\r\n` +
    `StartFragment:${String(wrapped.indexOf(startFragment) + startFragment.length).padStart(10, "0")}\r\n` +
    `EndFragment:${String(wrapped.indexOf(endFragment)).padStart(10, "0")}\r\n`;

  return header + wrapped;
}

/**
 * Write HTML + MathML to the system clipboard using the modern ClipboardItem API.
 * Falls back to execCommand copy when ClipboardItem is unavailable.
 *
 * @param {DocumentSegment[]} segments
 * @param {{ includeCfHtml?: boolean, plainText?: string }} [options]
 * @returns {Promise<{ html: string, plainText: string, method: "clipboard-item" | "execCommand" }>}
 */
export async function copyMathMLToClipboard(segments, options = {}) {
  const html = buildHtmlWithMathML(segments);
  const plainText = options.plainText ?? buildPlainTextFallback(segments);

  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    /** @type {Record<string, Blob>} */
    const items = {
      "text/html": new Blob([options.includeCfHtml ? wrapCfHtml(html) : html], {
        type: "text/html",
      }),
      "text/plain": new Blob([plainText], { type: "text/plain" }),
    };

    await navigator.clipboard.write([new ClipboardItem(items)]);
    return { html, plainText, method: "clipboard-item" };
  }

  await copyViaExecCommand(html);
  return { html, plainText, method: "execCommand" };
}

/**
 * Legacy fallback: select hidden DOM node and execCommand('copy').
 * @param {string} html
 */
async function copyViaExecCommand(html) {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.setAttribute("contenteditable", "true");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  document.body.appendChild(container);

  const range = document.createRange();
  range.selectNodeContents(container);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  const ok = document.execCommand("copy");
  document.body.removeChild(container);

  if (!ok) {
    throw new Error("execCommand('copy') failed — clipboard permission or focus issue");
  }
}

/** @param {string} text */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Sample fixtures for manual Word paste testing */
export const SAMPLE_FIXTURES = {
  inlineFraction: [
    { type: "text", value: "The ratio is " },
    {
      type: "math",
      latex: "\\frac{a}{b}",
      mathml:
        '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mi>a</mi><mi>b</mi></mfrac></math>',
    },
    { type: "text", value: " for all positive values." },
  ],
  displayIntegral: [
    { type: "text", value: "Gaussian integral:\n" },
    {
      type: "math",
      display: true,
      latex: "\\int_0^\\infty e^{-x^2}\\,dx",
      mathml:
        '<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><msubsup><mo>∫</mo><mn>0</mn><mi>∞</mi></msubsup><msup><mi>e</mi><mrow><mo>−</mo><msup><mi>x</mi><mn>2</mn></msup></mrow></msup><mi>d</mi><mi>x</mi><mo>=</mo><mfrac><msqrt><mi>π</mi></msqrt><mn>2</mn></mfrac></math>',
    },
  ],
  matrix: [
    {
      type: "math",
      display: true,
      latex: "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}",
      mathml:
        '<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mtable><mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr><mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr></mtable></math>',
    },
  ],
};
