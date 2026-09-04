/**
 * Delivery bridge — wraps the root convertAiResponse pipeline for Word delivery.
 * Uses Codex/VS Code AI conversion modules; do not duplicate parsing here.
 */

import { convertAiResponse } from "../index.mjs";
import { segmentsToDocumentXml, createDocx } from "./docx.mjs";
import { buildWordClipboardHtml, buildPlainTextFallback } from "./clipboard-from-segments.mjs";

/**
 * @param {string} input Raw AI response text
 */
export function convertForWordDelivery(input) {
  const segments = convertAiResponse(input);
  /** @type {Array<{ segment: object, message: string }>} */
  const errors = [];

  const converted = segments.map((seg) => {
    if (seg.type === "text") return seg;
    if (!seg.mathMl || seg.mathMl.includes('class="MJX_Error"') || seg.mathMl.includes("<merror")) {
      errors.push({
        segment: seg,
        message: "Unsupported LaTeX or conversion error",
      });
      return { type: "text", value: seg.display ? `$$${seg.latex}$$` : `$${seg.latex}$` };
    }
    return seg;
  });

  const html = buildWordClipboardHtml(converted.filter((s) => s.type === "text" || s.mathMl));
  const ooxml = segmentsToDocumentXml(converted.filter((s) => s.type === "text" || s.omml));
  const plainText = buildPlainTextFallback(converted);
  const mathCount = converted.filter((s) => s.type === "math").length;

  return {
    segments: converted,
    html,
    ooxml,
    plainText,
    docx: createDocx(converted.filter((s) => s.type === "text" || s.omml)),
    errors,
    stats: {
      mathCount,
      textCount: converted.filter((s) => s.type === "text").length,
      errorCount: errors.length,
    },
  };
}
