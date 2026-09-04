/**
 * Build OOXML fragments containing OMML for Office.js Range.insertOoxml().
 *
 * Input OMML is expected from the conversion stage (MathML -> OMML via MML2OMML.xsl
 * or mathml2omml). This module wraps OMML in valid WordprocessingML paragraph structure.
 */

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const M_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math";

/**
 * Strip XML declaration / outer wrapper if the converter returns a full m:oMath document.
 * @param {string} omml
 * @returns {string}
 */
export function extractOMMLBody(omml) {
  const trimmed = omml.trim();
  const oMathMatch = trimmed.match(/<m:oMath[\s\S]*<\/m:oMath>/);
  if (oMathMatch) return oMathMatch[0];
  const oMathParaMatch = trimmed.match(/<m:oMathPara[\s\S]*<\/m:oMathPara>/);
  if (oMathParaMatch) return oMathParaMatch[0];
  return trimmed;
}

/**
 * Wrap inline OMML inside a paragraph with optional surrounding text runs.
 * @param {string} omml - m:oMath or m:oMathPara fragment
 * @param {{ beforeText?: string, afterText?: string, display?: boolean }} [options]
 * @returns {string}
 */
export function wrapOMMLInParagraph(omml, options = {}) {
  const body = extractOMMLBody(omml);
  const isDisplay = options.display || body.startsWith("<m:oMathPara");

  const beforeRun = options.beforeText
    ? `<w:r><w:t xml:space="preserve">${escapeXml(options.beforeText)}</w:t></w:r>`
    : "";

  const afterRun = options.afterText
    ? `<w:r><w:t xml:space="preserve">${escapeXml(options.afterText)}</w:t></w:r>`
    : "";

  const mathBlock = isDisplay
    ? body.startsWith("<m:oMathPara")
      ? body
      : `<m:oMathPara xmlns:m="${M_NS}">${body}</m:oMathPara>`
    : body.startsWith("<m:oMath")
      ? body
      : `<m:oMath xmlns:m="${M_NS}">${body}</m:oMath>`;

  return (
    `<w:p xmlns:w="${W_NS}" xmlns:m="${M_NS}">` +
    beforeRun +
    mathBlock +
    afterRun +
    `</w:p>`
  );
}

/**
 * Build a multi-segment paragraph: text runs interleaved with inline OMML.
 * @param {Array<{ type: "text", value: string } | { type: "math", omml: string }>} segments
 * @returns {string}
 */
export function buildParagraphFromSegments(segments) {
  const parts = segments.map((seg) => {
    if (seg.type === "text") {
      return `<w:r><w:t xml:space="preserve">${escapeXml(seg.value)}</w:t></w:r>`;
    }
    const body = extractOMMLBody(seg.omml);
    return body.startsWith("<m:oMath") ? body : `<m:oMath xmlns:m="${M_NS}">${body}</m:oMath>`;
  });

  return `<w:p xmlns:w="${W_NS}" xmlns:m="${M_NS}">${parts.join("")}</w:p>`;
}

/**
 * Wrap one or more paragraph fragments in a minimal OOXML package for insertOoxml.
 * Use this when Word rejects bare paragraph fragments on a given host.
 * @param {string[]} paragraphFragments
 * @returns {string}
 */
export function wrapInOoxmlPackage(paragraphFragments) {
  const body = paragraphFragments.join("");
  return (
    `<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">` +
    `<pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml">` +
    `<pkg:xmlData>` +
    `<w:document xmlns:w="${W_NS}" xmlns:m="${M_NS}">` +
    `<w:body>${body}<w:sectPr/></w:body>` +
    `</w:document>` +
    `</pkg:xmlData>` +
    `</pkg:part>` +
    `</pkg:package>`
  );
}

/**
 * Build a full OOXML document from converted delivery segments.
 * @param {Array<{ type: "text", value: string } | { type: "math", omml: string, display?: boolean }>} segments
 * @returns {string}
 */
export function buildOoxmlDocument(segments) {
  /** @type {string[]} */
  const paragraphs = [];
  /** @type {Array<{ type: "text", value: string } | { type: "math", omml: string }>} */
  let inlineBuffer = [];

  const flushInline = () => {
    if (inlineBuffer.length === 0) return;
    paragraphs.push(buildParagraphFromSegments(inlineBuffer));
    inlineBuffer = [];
  };

  for (const seg of segments) {
    if (seg.type === "math" && seg.display) {
      flushInline();
      paragraphs.push(wrapOMMLInParagraph(seg.omml, { display: true }));
    } else if (seg.type === "math") {
      inlineBuffer.push(seg);
    } else {
      inlineBuffer.push(seg);
    }
  }
  flushInline();

  if (paragraphs.length === 0) {
    return wrapInOoxmlPackage([`<w:p xmlns:w="${W_NS}"><w:r><w:t/></w:r></w:p>`]);
  }

  return paragraphs.length === 1
    ? paragraphs[0]
    : wrapInOoxmlPackage(paragraphs);
}

/** Minimal OMML for smoke tests before the conversion pipeline is wired. */
export const SAMPLE_OMML = {
  fraction: `<m:oMath xmlns:m="${M_NS}"><m:f><m:num><m:r><m:t>a</m:t></m:r></m:num><m:den><m:r><m:t>b</m:t></m:r></m:den></m:f></m:oMath>`,
  inlineText: `<m:oMath xmlns:m="${M_NS}"><m:r><m:t>2+2=4</m:t></m:r></m:oMath>`,
};

/** @param {string} text */
function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
