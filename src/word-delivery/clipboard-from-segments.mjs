/**
 * Build Word-optimized clipboard payloads from converted segments (Codex/VS Code AI shape).
 *
 * Segment shape from convertAiResponse():
 *   { type: "text", value }
 *   { type: "math", latex, display, mathMl, omml }
 */

const MATHML_NS = "http://www.w3.org/1998/Math/MathML";

/**
 * Build HTML optimized for Word paste: bare <math> nodes, minimal wrapper markup.
 * Avoids span/div wrappers that can interfere with Word's MathML detection.
 * @param {Array<{ type: "text", value: string } | { type: "math", latex: string, display: boolean, mathMl: string }>} segments
 * @returns {string}
 */
export function buildWordClipboardHtml(segments) {
  const body = segments
    .map((seg) => {
      if (seg.type === "text") {
        return escapeHtml(seg.value).replace(/\n/g, "<br/>");
      }
      const inner = seg.mathMl.replace(/^<math[^>]*>/, "").replace(/<\/math>$/, "");
      const displayAttr = seg.display ? ' display="block"' : "";
      return `<math xmlns="${MATHML_NS}"${displayAttr}>${inner}</math>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${body}</body></html>`;
}

/**
 * @param {Array<{ type: "text", value: string } | { type: "math", latex: string, display: boolean }>} segments
 */
export function buildPlainTextFallback(segments) {
  return segments
    .map((seg) => {
      if (seg.type === "text") return seg.value;
      return seg.display ? `\n$$${seg.latex}$$\n` : `$${seg.latex}$`;
    })
    .join("");
}

/**
 * Build Markdown that Notion can turn into native text blocks while preserving
 * LaTeX delimiters as the most portable equation fallback.
 * @param {Array<{ type: "text", value: string } | { type: "math", latex: string, display: boolean }>} segments
 */
export function buildNotionMarkdown(segments) {
  return segments
    .map((seg) => {
      if (seg.type === "text") return seg.value;
      return seg.display ? `\n\n$$\n${seg.latex}\n$$\n\n` : `$${seg.latex}$`;
    })
    .join("")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/**
 * Build semantic HTML for Notion paste. Notion tends to keep headings, lists,
 * quotes, code blocks, and inline emphasis from HTML more reliably than from a
 * visual preview copy, while the plain text clipboard fallback remains Markdown.
 * @param {Array<{ type: "text", value: string } | { type: "math", latex: string, display: boolean }>} segments
 */
export function buildNotionClipboardHtml(segments) {
  const markdown = buildNotionMarkdown(segments);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${markdownToHtml(markdown)}</body></html>`;
}

/**
 * Extract body inner HTML for preview (without full document wrapper).
 * @param {string} html
 */
export function extractBodyInner(html) {
  const match = html.match(/<body>([\s\S]*)<\/body>/);
  return match ? match[1] : html;
}

/**
 * @param {Array} segments
 * @param {{ plainText?: string }} [options]
 */
export async function copySegmentsToClipboard(segments, options = {}) {
  const html = buildWordClipboardHtml(segments);
  const plainText = options.plainText ?? buildPlainTextFallback(segments);

  if (typeof ClipboardItem !== "undefined" && globalThis.navigator?.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      }),
    ]);
    return { html, plainText, method: "clipboard-item" };
  }

  throw new Error("ClipboardItem API unavailable — serve UI over http://localhost");
}

/**
 * @param {Array} segments
 */
export async function copySegmentsToNotionClipboard(segments) {
  const html = buildNotionClipboardHtml(segments);
  const markdown = buildNotionMarkdown(segments);

  if (typeof ClipboardItem !== "undefined" && globalThis.navigator?.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([markdown], { type: "text/plain" }),
      }),
    ]);
    return { html, plainText: markdown, method: "clipboard-item" };
  }

  throw new Error("ClipboardItem API unavailable — serve UI over http://localhost");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(text) {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  const code = [];
  html = html.replace(/`([^`]+)`/g, (_, value) => {
    const token = `\u0000CODE${code.length}\u0000`;
    code.push(`<code>${value}</code>`);
    return token;
  });
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  html = html.replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>");
  html = html.replace(/\$([^$\n]+)\$/g, '<span data-equation="inline">$1</span>');
  for (let i = 0; i < code.length; i += 1) {
    html = html.replace(`\u0000CODE${i}\u0000`, code[i]);
  }
  return html;
}

function flushParagraph(lines, blocks) {
  if (!lines.length) return;
  blocks.push(`<p>${renderInlineMarkdown(lines.join(" "))}</p>`);
  lines.length = 0;
}

function flushList(list, blocks) {
  if (!list) return null;
  const items = list.items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("");
  blocks.push(`<${list.tag}>${items}</${list.tag}>`);
  return null;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  const paragraph = [];
  let list = null;
  let codeFence = null;
  let quote = null;
  let displayMath = null;

  for (const line of lines) {
    if (displayMath) {
      if (line.trim() === "$$") {
        blocks.push(`<p data-equation="block">$$<br/>${escapeHtml(displayMath.join("\n")).replace(/\n/g, "<br/>")}<br/>$$</p>`);
        displayMath = null;
      } else {
        displayMath.push(line);
      }
      continue;
    }

    const fence = line.match(/^```([A-Za-z0-9_-]*)\s*$/);
    if (codeFence) {
      if (fence) {
        const language = codeFence.language ? ` data-language="${escapeAttribute(codeFence.language)}"` : "";
        blocks.push(`<pre><code${language}>${escapeHtml(codeFence.lines.join("\n"))}</code></pre>`);
        codeFence = null;
      } else {
        codeFence.lines.push(line);
      }
      continue;
    }
    if (fence) {
      flushParagraph(paragraph, blocks);
      list = flushList(list, blocks);
      if (quote) {
        blocks.push(`<blockquote>${renderInlineMarkdown(quote.join("<br/>"))}</blockquote>`);
        quote = null;
      }
      codeFence = { language: fence[1], lines: [] };
      continue;
    }

    if (line.trim() === "$$") {
      flushParagraph(paragraph, blocks);
      list = flushList(list, blocks);
      displayMath = [];
      continue;
    }

    if (!line.trim()) {
      flushParagraph(paragraph, blocks);
      list = flushList(list, blocks);
      if (quote) {
        blocks.push(`<blockquote>${renderInlineMarkdown(quote.join("<br/>"))}</blockquote>`);
        quote = null;
      }
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, blocks);
      list = flushList(list, blocks);
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph(paragraph, blocks);
      list = flushList(list, blocks);
      quote ??= [];
      quote.push(quoteMatch[1]);
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph(paragraph, blocks);
      const tag = unordered ? "ul" : "ol";
      if (!list || list.tag !== tag) list = flushList(list, blocks) ?? { tag, items: [] };
      list.items.push(unordered ? unordered[1] : ordered[1]);
      continue;
    }

    list = flushList(list, blocks);
    paragraph.push(line);
  }

  flushParagraph(paragraph, blocks);
  flushList(list, blocks);
  if (quote) blocks.push(`<blockquote>${renderInlineMarkdown(quote.join("<br/>"))}</blockquote>`);
  if (codeFence) {
    const language = codeFence.language ? ` data-language="${escapeAttribute(codeFence.language)}"` : "";
    blocks.push(`<pre><code${language}>${escapeHtml(codeFence.lines.join("\n"))}</code></pre>`);
  }
  if (displayMath) {
    blocks.push(`<p data-equation="block">$$<br/>${escapeHtml(displayMath.join("\n")).replace(/\n/g, "<br/>")}<br/>$$</p>`);
  }

  return blocks.join("\n");
}

/**
 * Compare Codex segmentsToHtml copy vs bare-MathML clipboard strategy.
 * @returns {{ codexStyle: string, wordOptimized: string }}
 */
export function compareHtmlStrategies(segments, codexHtmlBody) {
  return {
    codexStyle: codexHtmlBody,
    wordOptimized: extractBodyInner(buildWordClipboardHtml(segments)),
  };
}
