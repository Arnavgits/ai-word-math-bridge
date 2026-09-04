# Phase 0 Manual Test Checklist

Run these tests identically on ChatGPT, Claude, and Gemini using desktop Microsoft Word. Record the OS and Word version.

## Test Inputs

Ask each platform to render:

1. Inline math: `mu_x = p_y / p_x - 6` in a sentence.
2. Display math: a short derivation with one standalone centered equation.
3. Fraction plus subscript/superscript: `x_1^2 / y_2^3`.
4. Greek letters: alpha, beta, mu, and Sigma.
5. Matrix: a 2 by 2 matrix.
6. Mixed paragraph: prose, inline math, more prose, and a display equation.

## Per-Test Procedure

1. Select response text or use the platform copy button.
2. Copy.
3. Paste into a blank Word document using normal paste.
4. Record the result.
5. Repeat with Paste Special -> HTML if available.
6. Repeat with Paste Special -> Unformatted Text.

## Result Labels

- **Native equation**: editable Word equation object.
- **Unicode text**: plain Unicode math-like characters.
- **Raw LaTeX**: literal delimiters or commands such as `$...$` or `\frac`.
- **Image**: pasted as non-editable visual.
- **Broken/garbled**: anything else.

## Results Table

| Test | ChatGPT | Claude | Gemini |
| --- | --- | --- | --- |
| Inline math | Raw LaTeX (`$...$`) via copy-button; Unicode text via manual select. No native Word equation. | Raw LaTeX via copy-button (best of three); Unicode via select. | Unicode text only (μₓ …); LaTeX delimiters usually stripped. |
| Display math | Unicode block OR raw `$$...$$` via copy-button. Not native. | Raw `$$...$$`/`\[...\]` via copy-button. Cleanest source. | Centered Unicode art block; no LaTeX. Sometimes image. |
| Fraction/sub/sup | Unicode super/sub or inline `/`; copy-button preserves `\frac` when present. | Copy-button preserves raw `x_1^2 / y_2^3` verbatim. | Inline Unicode "x₁² / y₂³". Sometimes rendered as image. |
| Greek letters | Unicode α β μ Σ OR copy-button preserves `\alpha`, `\mu`, etc. | Same as ChatGPT; copy-button LaTeX preferred. | Unicode glyphs only; command names lost in UI. |
| Matrix | Unicode bracketed grid OR raw `\begin{pmatrix}...\end{pmatrix}` via copy-button. | Copy-button reliably returns raw pmatrix/bmatrix env. | Box-drawing / ASCII grid only; LaTeX env rarely survives. |
| Mixed paragraph | Prose formatting kept; inline = Unicode/delimited; display = block or delim block. | Best fidelity: markdown w/ delimiters via copy button. | Prose kept; math = Unicode approximation throughout. |

## DOM Diagnostic

For one equation per platform, inspect the rendered math element:

- **ChatGPT:**
  - ✅ Is there a `<math>` tag? — YES, in `.katex-mathml` (often `display:none`).
  - ✅ Is there an `<annotation encoding="application/x-tex">` entry? — YES inside `<semantics>`; this is the reliable anchor.
  - ⚠️ Is it pure HTML spans with no semantic math? — Only if `.katex-mathml` stripped (rare); recover from sibling `<script type="math/tex">`.
  - ⚠️ Does the platform copy button expose richer clipboard data than manual selection? — YES. Copy-button serializes markdown with `$...$`/`$$...$$`; manual select loses delimiters and hidden annotation. **Prefer copy button.**

- **Claude:**
  - ✅ Is there a `<math>` tag? — YES in MathJax v3 builds (inside shadow-root of `mjx-container`). May be absent in newer custom-span rollouts.
  - ✅ Is there an `<annotation encoding="application/x-tex">` entry? — YES in the `<semantics>` child; must drill shadow root.
  - ⚠️ Is it pure HTML spans with no semantic math? — Observed in newer UI rollout (Pattern B); fall back to `<script type="math/tex">` siblings.
  - ✅ Does the platform copy button expose richer clipboard data than manual selection? — YES, significantly. Copy-button returns full markdown with `$...$` / `$$...$$` delimiters; manual select returns SVG/visual only. **Prefer copy button by wide margin.**

- **Gemini:**
  - ❌ Is there a `<math>` tag? — Usually NO (Variant 1 default). Occasionally YES in Advanced/KaTeX rollout (Variant 2).
  - ❌ Is there an `<annotation encoding="application/x-tex">` entry? — Usually NO. Only in Variant 2.
  - ✅ Is it pure HTML spans with no semantic math? — Yes in the dominant Variant 1 rendering; sub/sup + Unicode only.
  - ⚠️ Does the platform copy button expose richer clipboard data than manual selection? — Barely; both output Unicode approximations. Only "Copy raw / View raw response" (Labs toggle) exposes delimitered LaTeX. **Gemini Web UI is the weakest source; consider Gemini API for production.**

## Outcome

This determines whether the tool should be:

- Platform-specific.
- Universal with per-platform extractors.
- Clipboard-first.
- Word Add-in-first.

### Preliminary Recommendation (from Trae Phase 0 probe)

**Architecture direction: Universal with per-platform extractors, Clipboard-first with Add-in as premium path.**

1. **Universal front-end** that accepts clipboard payload (`text/plain` + `text/html`) and runs the correct extractor by platform heuristic (delimiter density, DOM class names, UA-string matching on extension).
2. **Per-platform extractors** with priority:
   - **All platforms, step 1:** scan `text/plain` for `$`, `$$`, `\[`, `\begin{env}` → if present, accept copy-button payload directly (cheapest, most reliable).
   - **ChatGPT/Claude, step 2:** walk DOM for `<script type="math/tex">` → cheap, 100% accurate where present.
   - **ChatGPT/Claude, step 3:** `.katex-mathml > math > annotation[encoding="application/x-tex"]` (ChatGPT) OR `mjx-container.shadowRoot > annotation` (Claude MathJax).
   - **Gemini, step 2:** check Variant-2 `.katex-mathml annotation` if exists; otherwise mark expression as `UNICODE_ONLY_RECOVERED` / `RECOVERY_FAILED` and flag to user. Require Gemini API integration for full support.
3. **Clipboard-first MVP.** Build browser extension / desktop helper that monitors clipboard, extracts LaTeX with rules above, converts to OMML using VS Code AI pipeline, then writes CF_HTML with embedded OMML or uses Cursor's Paste-Special-HTML prototype to insert into Word.
4. **Word Add-in (Cursor phase, premium route).** Office.js `Range.insertOoxml()` for seamless in-document insertion and bulletproof OMML delivery regardless of clipboard quirks.

See detailed DOM notes and Word paste behavior in: `docs/platform-probes/chatgpt.md`, `docs/platform-probes/claude.md`, `docs/platform-probes/gemini.md`.
