# Source Extractors — Contract & Directory

**Owner:** Trae (Platform Probe Specialist)

## Purpose

Convert raw platform input (pasted text, HTML DOM fragments, clipboard payloads, or API JSON) into an **ordered segment list** that the downstream pipeline (`src/conversion/` then `src/word-delivery/`) can consume without modification.

The MVP must accept at minimum **manual pasted AI response text** as the input source, because platform-specific DOM extraction is not required to demo the full LaTeX → MathML → OMML → Word pipeline. Browser extension / DOM-level extractors can be layered on top later without changing downstream code.

## Segment Contract

All extractors emit an array of segments. Two segment types exist:

```js
// Prose or any non-math content. Escaped and passed through as Word text runs.
{ type: "text",  value: string }

// A math expression. The `latex` field is fed into src/conversion latexToMathMl().
// `display: true` = standalone display equation; display: false = inline within a paragraph.
// `source` is diagnostic only: records which extractor rule / platform tag produced it.
{ type: "math",  latex: string,  display: boolean,  source?: string }
```

**Why this shape?**
- `src/conversion/index.js:24` → `latexToMathMl(segment)` requires exactly `{ latex, display }`.
- `src/word-delivery/ooxml-builder.js:65` → `buildParagraphFromSegments(segments)` accepts `{ type:"text", value }` and `{ type:"math", omml }`. The bridge code between extractors and builder iterates, converts math segments via VS Code AI, and swaps `omml` in place.

**Guarantees:**
1. Segments are returned in **document order** (top → bottom as the user sees it).
2. Consecutive `text` segments are **not** merged by the extractor; a de-dupe pass at the pipeline boundary is acceptable but not mandatory.
3. Math `latex` strings **must not** contain the outer delimiter characters (`$`, `$$`, `\(`, `\[`, `\begin{...}` / `\end{...}` are kept *inside* `latex` for AMS environments because `\begin{bmatrix}` is real LaTeX; only pure delimiter pairs are stripped).
4. A math segment's `latex` string may contain internal newlines (preserved for `align`, `matrix`, `cases`).

## Input Sources & Extractor Priority

For a given input, try strategies in this order. Stop on the first extractor that returns a non-empty segment list with ≥ 1 math segment.

| Priority | Extractor | Input | MVP required? |
| --- | --- | --- | --- |
| 1 | `manual-text` | `string` pasted AI response text | ✅ YES — unblocks entire MVP |
| 2 | `chatgpt-copybutton` | `{ text: string, html?: string }` clipboard | ✅ Built on top of (1) |
| 3 | `claude-copybutton` | `{ text: string, html?: string }` clipboard | ✅ Built on top of (1) |
| 4 | `chatgpt-dom` | `Document` / browser extension | ❌ Future (requires extension) |
| 5 | `claude-dom` | `Document` / browser extension with shadow-root access | ❌ Future |
| 6 | `gemini-dom` | `Document` / **Gemini API JSON** (recommended) | ⚠️ DOM extractor partial; API fallback strongly preferred |

## Extractor Files

```
src/source-extractors/
  README.md                  # This file. Segment contract + rules.
  manual-text.js             # MVP entry: paste text -> segments. Always works.
  selector-cheatsheet.js     # Per-platform DOM selector strings (reference, not executed).
  chatgpt-dom.js             # DOM extractor for chat.openai.com. Optional MVP+1.
  claude-dom.js              # DOM extractor for claude.ai. Optional MVP+1.
  gemini-fallback.js         # Lossy Unicode->LaTeX heuristics and API-JSON reader.
```

## Pipeline Wiring Pseudocode

This is the integration contract the extractor layer promises to the rest of the tool — not executable here, but authoritative for Codex / VS Code AI / Cursor integration:

```js
const { extractFromText } = require('./src/source-extractors/manual-text');
const { latexToMathMl, mathMlToOmml } = require('./src/conversion');
const { buildParagraphFromSegments } = require('./src/word-delivery/ooxml-builder');

function aiResponseToWordSegments(rawText) {
  const extracted = extractFromText(rawText);                 // Trae layer
  return extracted.map(seg => {
    if (seg.type === 'text') return seg;
    const mathMl = latexToMathMl({ latex: seg.latex, display: seg.display }); // VS Code AI
    return { type: 'math', omml: mathMlToOmml(mathMl) };
  });
}

// Cursor layer writes buildParagraphFromSegments(aiResponseToWordSegments(pastedText))
// as OOXML into Word via insertOoxml() or a clipboard HTML wrapper.
```

## Error & Degradation Behaviour

Extractors never throw for malformed input. Instead:

- If a math delimiter opens but never closes, treat the remainder as `text` and add a warning object onto a returned metadata bag: `{ segments, warnings: [{ code: 'UNCLOSED_DELIM', at: index }] }`.
- If a Gemini DOM expression cannot be recovered (Variant 1), emit `{ type: "text", value: "<original Unicode glyphs here>" }` plus a warning `{ code: 'GEMINI_UNICODE_ONLY_RECOVERED', at: index }`. The user sees it as plain text; we don't fabricate equations.
- If AMS environment `\begin{env}`...`\end{env}` spans are detected unbalanced, emit as text with `AMS_ENV_UNBALANCED` warning.

## Follow-ups Trae owns

- [ ] Expand `selector-cheatsheet.js` with actual JS snippet helpers used by a future extension.
- [ ] Add per-extract snapshot unit tests under `tests/source-extractors/` using real captured text from `docs/platform-probes/*.md Sample Captured Source snippets.
- [ ] Add `gemini-api.js` extractor when Gemini API JSON schema is available as an optional input path.
