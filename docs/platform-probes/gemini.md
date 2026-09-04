# Google Gemini Platform Probe Report

**Date:** 2026-08-19
**OS:** Windows 10/11 (testing target)
**Word Version:** Microsoft Word 365 Desktop (16.x)
**Browser:** Chrome / Edge (latest)
**Platform:** gemini.google.com (Gemini 1.5 Pro / Flash / Advanced web UI)

## Summary

Google Gemini's web UI has historically been the least math-friendly of the three platforms: it frequently renders math as plain Unicode text with minimal semantic markup and aggressively strips LaTeX delimiters from displayed output. Recent (2025–2026) UI revisions have improved the rendering, sometimes using KaTeX-like spans and hidden annotation nodes, but the behavior is **inconsistent between models and rollout buckets**. Copy-button payloads often contain "math plaintext approximations" rather than raw LaTeX, meaning DOM-level source recovery is significantly harder for Gemini than for ChatGPT or Claude. Word paste from Gemini yields **Unicode text or images; raw LaTeX recovery must come from screenshot/OCR (not recommended) or from the Gemini API-side raw response rather than the web UI**.

## Results Table

| Test | Normal Paste | Paste Special: HTML | Paste Special: Unformatted Text |
| --- | --- | --- | --- |
| Inline math `mu_x = p_y / p_x - 6` | Unicode μₓ = pᵧ / pₓ − 6 in a single line; glyphs only; no equation object | HTML spans with super/sub script styles; still not a native equation | Plain Unicode μₓ = p_y/p_x − 6 (no delimiters; no LaTeX commands visible) |
| Display math (centered derivation) | Centered-looking Unicode using spaces/newlines; looks like ASCII/Unicode art block | Div-level block styling; same Unicode content | Plain ASCII-style block, no LaTeX delimiters |
| Fraction `x_1^2 / y_2^3` | Inline Unicode "x₁² / y₂³" — single slash, no stacked fraction | Fraction sometimes rendered as stacked visual with table/grid HTML; still not OMML | Plain "x_1^2 / y_2^3" text approximation OR Unicode super/sub version |
| Greek letters α, β, μ, Σ | Correct Unicode α β μ Σ | Same Unicode glyphs | Correct Unicode glyphs |
| 2×2 matrix | Box-drawing characters or bracketed 2D layout with spaces for alignment. **Rarely LaTeX matrix environment visible.** | Table-like grid with borders or background coloring; not Word equation matrix | Bracket-plus-spaces ASCII matrix or Unicode-matrix text — no `\begin{pmatrix}` preserved in copy output |
| Mixed paragraph (prose + inline + display) | Prose OK; math = inline and block Unicode approximations. Occasionally the Gemini UI renders a *screenshot/SVG* of complex math. | Same + prose keeps bold/italic | All plain Unicode; no delimiters. Complex expressions often pasted as images. |

**Result Label Summary:** `Unicode text + occasional Image`. **Raw LaTeX frequently lost at UI layer.**

## DOM Inspection Notes

Target: one inline and one display math expression inside Gemini's assistant answer block (`conversation-turn-assistant` / `model-response-text` / newer `.generation-container`).

### Rendering variants observed

Gemini A/B tests math rendering heavily; all three of the following variants have been seen in the wild across 2024–2026:

#### Variant 1 — Plain Unicode spans (most common default)

```
.generation-container .markdown-main
  └─ p
       ├─ span.role-empty (no semantic class)
       └─ sub / sup HTML tags around Unicode glyphs
```

1. **`<math>` tag:** NO.
2. **`<annotation encoding="application/x-tex">`:** NO.
3. **No hidden script tag siblings** with raw LaTeX either — source was discarded at render time.
4. **Extractor note:** In this variant, **accurate LaTeX recovery from DOM alone is impossible**. The only viable paths are: (a) Gemini API raw output access (recommended if user has API key), (b) copy/paste of an alternate "raw response" view exposed in Labs/Build tools, or (c) brittle reverse-translation of super/sub + Greek glyphs back to LaTeX source (lossy; do not rely on).

#### Variant 2 — KaTeX-like spans (Advanced models, newer UI rollouts)

```
.model-response-text
  └─ span.math (or .katex)
       ├─ span.katex-mathml style="display:none;"  # sometimes present
       │    └─ math > semantics > annotation[encoding="application/x-tex"]
       └─ span.katex-html  -> visible glyphs
```

1. **`<math>` tag:** YES inside hidden `.katex-mathml` span (same pattern as ChatGPT).
2. **`<annotation>` with LaTeX:** YES if the `.katex-mathml` wrapper is present.
3. **Extractor note:** Query `.katex-mathml math annotation[encoding="application/x-tex"]` — this is the **golden path when available**; prefer it over all other recovery strategies.

#### Variant 3 — SVG / `<img>` rendering of complex expressions

For heavy expressions (integrals, matrices, aligned systems), Gemini often drops a **standalone `<img>` or inline `<svg>`** into the DOM instead of text spans. The `img.alt` attribute is sometimes set to a plain-text approximation; rarely does it carry LaTeX. SVG `title`/`desc` children similarly carry plaintext or nothing.

1. **`<math>` tag:** NO.
2. **`<annotation>`:** NO.
3. **Extractor note:** OCR required for source recovery; out of scope for Phase 0. Surface this case in the UX with a "could not recover LaTeX for this expression" error and ask the user to re-submit a simpler request, or enable API-side source capture.

### Copy button vs manual selection

- **Copy button icon on Gemini response card:** Outputs the "post-processed plain text" — usually **just the Unicode approximation** (Variant 1/3) OR, if Variant 2 rendering is used, **sometimes re-serialized markdown** (inconsistent; do not rely on it). Matrix environments and aligned environments are almost never returned as LaTeX from the Gemini copy button.
- **Manual drag-select + Ctrl+C:** Effectively the same quality as the copy button; occasionally loses image alt text that the copy button would have preserved.
- **"Copy raw" / Labs-only "View raw response":** If present (Advanced features toggle), this is the only in-UI way to recover original LaTeX delimiters (`$`, `$$`, `\[`, `\]`). Prioritize teaching users to enable this if available.
- **Conclusion:** **Gemini UI-level LaTeX recovery is significantly worse than ChatGPT or Claude.** For Phase 0, document this as "partial support with fallback text". For production readiness, recommend **requiring the Gemini API client-side integration** where `candidates[0].content.parts[].text` still contains the original LaTeX source with delimiters — bypassing the UI render layer entirely.

## Recommended Extraction Strategy (Priority Order)

1. **Clipboard text scan — but be permissive and prepared for failure.**
   - Check `text/plain` for any surviving `$...$` or `$$...$$` or `\begin{*}`. If found, great.
   - Usually they will be absent; proceed to DOM-based steps.
2. **DOM: `.katex-mathml math annotation[encoding="application/x-tex"]` (Variant 2 only).**
   - If present, per-equation LaTeX source is recoverable.
3. **DOM: neighbouring `<script type="math/tex">` tags** (rare, but seen in Labs UI builds).
4. **Fallback — lossy text normalization:**
   - Translate known Unicode math blocks (`U+1D400–U+1D7FF` mathematical alphanumerics) back to ASCII letters with modifier commands (e.g., 𝐀 → `\mathbf{A}`).
   - Recognize `α β γ …` → `\alpha \beta \gamma`.
   - Recognize `sub`/`sup` HTML → `_{}` / `^{}`.
   - Output best-effort reconstructed LaTeX; mark as uncertain in tracker for downstream conversion to flag in UX.
5. **Non-recoverable case:**
   - If expression is `<img>` or `<svg>` without semantic alt, return `RECOVERY_FAILED` error object and surface to user; do not fabricate LaTeX.

## Sample Captured Source Snippets

All snippets sanitized: prompts, account info, chat IDs removed.

### Snippet A — Variant 1 default (pure Unicode spans, no semantic markup)

Source: Gemini Advanced 1.5 Pro web UI, mid-2025 rollout (most users). Copy-button output yields the same visual Unicode as the DOM. **No delimiters, no LaTeX commands.**

```
Given μₓ = pᵧ / pₓ − 6 and
α + β + γ = π,

we have a 2×2 matrix:
  [ a₁₁  a₁₂ ]
  [ a₂₁  a₂₂ ]
and the fraction x₁²/y₂³ equals 1.
```

Extractor outcome: `extractFromText()` returns **all `{ type:"text" }` segments — zero math**. This is correct; we do NOT invent LaTeX from glyphs. UX should show:

> ⚠ Gemini Web UI paste detected. No recoverable LaTeX delimiters found. Your math will be pasted as non-editable Unicode text.
>
> Fix options:
> 1. In Gemini Labs, enable "View raw response" toggle and copy that output instead.
> 2. Connect the **Gemini API** to this tool (Settings → Add API key) — JSON response parts still carry the delimitered `\mu_x = ...` source.
> 3. Paste equivalent text from ChatGPT/Claude for native Word equations.

### Snippet B — Variant 2 (Gemini Advanced, KaTeX rollout)

Observed only for a small % of Gemini Advanced traffic in 2025–2026. Contains `.katex` + `.katex-mathml` hidden span.

```html
<div class="model-response-text markdown-main">
  <p>The area is
    <span class="katex">
      <span class="katex-mathml" style="display:none">
        <math xmlns="http://www.w3.org/1998/Math/MathML">
          <semantics>
            <mrow><mi>A</mi><mo>=</mo><mi>π</mi><msup><mi>r</mi><mn>2</mn></msup></mrow>
            <annotation encoding="application/x-tex">A = \pi r^2</annotation>
          </semantics>
        </math>
      </span>
      <span class="katex-html" aria-hidden="true">…glyphs…</span>
    </span>
  for radius r.</p>
</div>
```

Extractor action (Variant 2 only): `querySelectorAll('.katex-mathml annotation[encoding="application/x-tex"]')` → yields `A = \pi r^2`. Treat as `{ type:"math", display:false, source:"gemini:annotation-variant2" }`.

### Snippet C — Variant 3 (complex expressions rendered as `<svg>` or `<img>`)

Complex integrals or matrices are rendered as inline SVG images. The `alt` attribute or SVG `<title>` child sometimes carries plain text but **never LaTeX**.

```html
<img class="inline-math"
     alt="Integral from 0 to 1 of (x squared) dx equals 1/3"
     src="data:image/svg+xml;base64,...">
```

Extractor outcome: **RECOVERY_FAILED**. Do not parse the natural-language alt string into LaTeX; risk of hallucinating wrong commands. UX must prompt "This Gemini expression was rendered as an image and cannot be turned into an editable Word equation. Re-ask for the math in a new chat, or enable Copy Raw / API mode."

### Snippet D — Gemini REST API JSON (recommended production source)

The **Gemini API v1beta `GenerateContentResponse`** preserves the original LaTeX with delimiters in `candidates[0].content.parts[].text`. Gemini's render layer strips these before painting the UI, but the API JSON payload has them.

```jsonc
// GET POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
{
  "candidates": [{
    "content": {
      "role": "model",
      "parts": [{
        "text": "Sure. Given $$\\mu_x = \\frac{p_y}{p_x} - 6$$ we derive:\n\n$$\\n\\begin{align}\\nS &= \\sum_{i=1}^N i \\\\ &= \\frac{N(N+1)}{2}.\\n\\end{align}\\n$$\n\nGreek inline: $\\alpha + \\beta + \\mu$."
      }]
    }
  }],
  "usageMetadata": { /* ... */ }
}
```

Extractor outcome (for API integration — future `gemini-api.js` reader):
```
text  "Sure. Given "
math  latex="\mu_x = \frac{p_y}{p_x} - 6"           display=true   source=gemini:api-dollar-display
text  " we derive:\n\n"
math  latex="\begin{align} S &= \sum_{i=1}^N i \\ &= \frac{N(N+1)}{2}. \end{align}"  display=true  source=gemini:api-ams
text  "\n\nGreek inline: "
math  latex="\alpha + \beta + \mu"                  display=false  source=gemini:api-dollar-inline
text  "."
```

This produces results **on par with ChatGPT/Claude copy-button payloads**. Recommend that Gemini-supported versions of the tool expose API-key input and fetch raw JSON; never attempt to scrape the Web UI as primary source.

### Snippet E — "Copy Raw" Labs toggle output

If user has the rare toggle enabled, copy-button yields markdown just like Claude's copy button, matching Snippet D structure. This is the only acceptable Web UI fallback.

## Word Notes

Direct paste into Word from Gemini:
- Unicode approximations paste cleanly as styled text; occasionally complex expressions come as PNG/SVG image objects embedded in the document.
- **Native Word equations are never produced by any native paste pathway** — the semantic markup simply doesn't exist in Variant 1 (the majority default), and in Variant 2 it's hidden and stripped during serialization.
- Recommendation for MVP: Treat Gemini output as a "tier-2 source". Ship ChatGPT + Claude support first; add Gemini via the **API route** as a planned feature. If Gemini Web UI must be supported, ship with clearly documented limitations and a prominent "we could not recover editable equations; pasted as plain Unicode" fallback banner in the UX.
