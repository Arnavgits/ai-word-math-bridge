/**
 * Lightweight AI-response segment parser for the manual-input MVP.
 *
 * Parses $...$, $$...$$, \(...\), and \[...\] delimiters while preserving prose order.
 * VS Code AI may replace this with a richer parser in src/conversion/ later.
 */

/** @typedef {{ type: "text", value: string } | { type: "math", latex: string, display: boolean }} ParsedSegment */

const DELIMITERS = [
  { open: "$$", close: "$$", display: true },
  { open: "\\[", close: "\\]", display: true },
  { open: "$", close: "$", display: false },
  { open: "\\(", close: "\\)", display: false },
];

/**
 * @param {string} input
 * @returns {ParsedSegment[]}
 */
export function parseAiResponse(input) {
  if (typeof input !== "string" || !input.trim()) {
    return [{ type: "text", value: "" }];
  }

  /** @type {ParsedSegment[]} */
  const segments = [];
  let i = 0;

  while (i < input.length) {
    const match = findNextDelimiter(input, i);
    if (!match) {
      appendText(segments, input.slice(i));
      break;
    }

    if (match.index > i) {
      appendText(segments, input.slice(i, match.index));
    }

    const closeIndex = input.indexOf(match.close, match.index + match.open.length);
    if (closeIndex === -1) {
      appendText(segments, input.slice(match.index));
      break;
    }

    const latex = input.slice(match.index + match.open.length, closeIndex).trim();
    if (latex) {
      segments.push({ type: "math", latex, display: match.display });
    }

    i = closeIndex + match.close.length;
  }

  return mergeAdjacentText(segments);
}

/**
 * @param {string} input
 * @param {number} from
 */
function findNextDelimiter(input, from) {
  let best = null;

  for (const delim of DELIMITERS) {
    const index = input.indexOf(delim.open, from);
    if (index === -1) continue;
    if (!best || index < best.index) {
      best = { ...delim, index };
    }
  }

  return best;
}

/** @param {ParsedSegment[]} segments @param {string} text */
function appendText(segments, text) {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last?.type === "text") {
    last.value += text;
  } else {
    segments.push({ type: "text", value: text });
  }
}

/** @param {ParsedSegment[]} segments */
function mergeAdjacentText(segments) {
  /** @type {ParsedSegment[]} */
  const merged = [];
  for (const seg of segments) {
    if (seg.type === "text" && merged.at(-1)?.type === "text") {
      merged[merged.length - 1].value += seg.value;
    } else {
      merged.push(seg);
    }
  }
  return merged;
}
