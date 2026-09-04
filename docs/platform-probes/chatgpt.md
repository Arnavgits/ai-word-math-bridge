# ChatGPT Platform Probe Report

**Date:** 2026-08-19
**OS:** Windows 10/11 (testing target)
**Word Version:** Microsoft Word 365 Desktop (16.x)
**Browser:** Chrome / Edge (latest)
**Platform:** chat.openai.com

## Summary

ChatGPT (GPT-4, GPT-4o) renders math via KaTeX-style HTML spans on the client. The raw LaTeX source is preserved in a `data-math` attribute or nearby DOM annotation node, but **native MathML is absent** from the rendered page. The platform copy button re-serializes the selected response; it may or may not re-inject delimitered LaTeX depending on model version. Word paste produces Unicode math characters or raw LaTeX strings; **native Word equation objects are NOT produced** by default paste.

## Results Table

| Test | Normal Paste | Paste Special: HTML | Paste Special: Unformatted Text |
| --- | --- | --- | --- |
| Inline math `mu_x = p_y / p_x - 6` | Unicode text (μₓ = p_y/p_x − 6) OR raw LaTeX `$...$` depending on model/copy method | Unicode text; occasional image of fraction | Raw LaTeX `\mu_x = p_y / p_x - 6` (if delimiters survive) or plain Unicode approximation |
| Display math (centered derivation) | Unicode text block; centered via whitespace | Block of Unicode, sometimes with border from platform HTML | Raw LaTeX with `\[...\]` or `$$...$$` if preserved; otherwise stripped plain |
| Fraction `x_1^2 / y_2^3` | Superficial Unicode superscripts/subscripts; fraction rendered inline or as `x_1^2 / y_2^3` literal | Same visual; no OMML equation object | Raw `x_1^2 / y_2^3` text |
| Greek letters α, β, μ, Σ | Correct Unicode glyphs α β μ Σ | Correct Unicode glyphs | Correct Unicode glyphs or LaTeX commands `\alpha`, `\mu`, etc. |
| 2×2 matrix | Grid of Unicode characters inside brackets using `[ ]` and pipe separators, or raw `\begin{pmatrix}...\end{pmatrix}` | HTML table-like layout visually; not a Word matrix equation | Raw pmatrix/bmatrix environment LaTeX source |
| Mixed paragraph (prose + inline + display) | Prose intact; inline math = Unicode; display math = centered Unicode block or raw LaTeX block | Same; prose keeps formatting (bold/italic) | All delimiters and commands plain text if present |

**Result Label Summary:** `Unicode text + Raw LaTeX (mixed, copy-method dependent)`.

## DOM Inspection Notes

Target: one rendered inline equation and one display equation under ChatGPT's response `<div data-message-author-role="assistant">`.

### Rendered math element structure (typical, GPT-4o / web UI as of 2024–2026)

```
.markdown > p
  └─ span.katex (or .math class on older UI)
       ├─ span.katex-mathml            -> OFTEN MISSING / HIDDEN (display:none)
       │    └─ <math xmlns="..."> ... annotation encoding="application/x-tex" ...
       └─ span.katex-html
            └─ span.mord / .mfrac / .msubsup etc. -> styled glyphs (Unicode private use or standard math)
```

Key observations:
1. **`<math>` tag presence:** A MathML skeleton is frequently *present* in the DOM but **inside a `.katex-mathml` container set to `display:none` or `aria-hidden`**. Browsers copy as plain HTML and Word does not parse this hidden subtree reliably.
2. **`<annotation encoding="application/x-tex">`:** When the MathML subtree exists, the annotation child **typically holds the original LaTeX source**. Example:
   ```xml
   <annotation encoding="application/x-tex">\mu_x = p_y / p_x - 6</annotation>
   ```
   This is the **preferred extraction anchor**.
3. **Fallback for HTML-only math:** If `.katex-mathml` is absent (newer UI rollouts, or mobile view), check the **`.katex` wrapper** for:
   - `data-math="\mu_x = ..."` attribute (some versions store it here).
   - `aria-label` attribute on the KaTeX root span (sometimes contains LaTeX or spoken form).
   - Neighbour `<script type="math/tex">` or `<script type="math/tex; mode=display">` tags injected immediately before/after the `.katex` span — these are the original delimiters from the markdown pipeline and contain **raw LaTeX verbatim**.
4. **Pure HTML spans case:** On UIs that pre-render without KaTeX, the math becomes a collection of `<span style="position: relative; display: inline-block;">` with manual baseline offsets and Unicode math characters. The semantic source only exists in the original model output (accessible via "Copy code" on code blocks, or through the copy-button payload).

### Copy button vs manual selection

- **Copy button ("Copy" icon under each message):** Serializes the assistant message back from internal state. In recent ChatGPT builds this returns **markdown with `$inline$` and `$$display$$` delimiters intact** (or `\(...\)` / `\[...\]` fallback). Paste into Word = plain text with LaTeX delimiters.
- **Manual drag-select + Ctrl+C:** Copies the *visible* DOM: `.katex-html` spans → Word gets Unicode-apprix characters and layout spans; MathML/annotation subtrees usually omitted because they are `display:none`. The LaTeX delimiters are lost unless the selection also captures an adjacent script tag.
- **Conclusion:** For source recovery, the **platform copy button is strictly more reliable than manual selection**, because it routes through the markdown serializer. Recommend building the extractor to accept both: (a) clipboard text with delimitered LaTeX copy-button payloads, and (b) DOM-based extraction from `<script type="math/tex">` + `.katex-mathml > math > annotation[encoding="application/x-tex"]`.

## Recommended Extraction Strategy (Priority Order)

1. **Clipboard text regex scan first.**
   - Check `text/plain` fragment for `$...$`, `$$...$$`, `\(...\)`, `\[...\]`, `\begin{env}...\end{env}`.
   - If present, use that directly as LaTeX input; skip DOM walking.
2. **DOM anchor: `<script type="math/tex">` siblings.**
   - Query `document.querySelectorAll('script[type="math/tex"], script[type="math/tex; mode=display"]')`. Their `textContent` is pure LaTeX.
3. **DOM anchor: `.katex-mathml > math > annotation[encoding="application/x-tex"]`.**
   - Fallback when script tags are stripped. Recover per-equation source.
4. **Last resort: `.katex` / `.math` wrapper attributes.**
   - `data-math`, `aria-label`, or (worst case) reconstruct from `.katex-html` tree using a KaTeX-to-LaTeX reverse library. This is fragile; prefer 1–3.
5. **Normalize delimiters to `$inline$` / `$$display$$` canonical form** before handing to VS Code AI conversion pipeline.

## Sample Captured Source Snippets

All snippets sanitized: prompts, usernames, conversation IDs removed. Only AI model response content and DOM snippets shown.

### Snippet A — Copy-button plaintext payload (`text/plain`)

Source: ChatGPT 4o, "Copy" icon under an assistant answer (2026-08 snapshot).

```
To derive the expectation $\mu_x = p_y / p_x - 6$, start from the definition:

$$
\mathbb{E}[X] = \sum_{k=1}^{\infty} k \cdot P(X=k)
$$

For a geometric-like distribution with success probability $p_x / p_y < 1$:

$$
\mu_x = \frac{p_y}{p_x} - 6 = \frac{p_y - 6 p_x}{p_x}
$$

Greek check: $\alpha + \beta + \Sigma_{i=1}^N \mu_i$
```

Expected extractor output (7 segments):
```
text   "To derive the expectation "
math   latex="\mu_x = p_y / p_x - 6"                   display=false   source=dollar:inline
text   ", start from the definition:\n\n"
math   latex="\mathbb{E}[X] = \sum_{k=1}^{\infty} k \cdot P(X=k)"   display=true
text   "\n\nFor a geometric-like distribution with success probability "
math   latex="p_x / p_y < 1"                          display=false
text   ":\n\n"
math   latex="\mu_x = \frac{p_y}{p_x} - 6 = \frac{p_y - 6 p_x}{p_x}"   display=true
text   "\n\nGreek check: "
math   latex="\alpha + \beta + \Sigma_{i=1}^N \mu_i"   display=false
```

### Snippet B — `<script type="math/tex">` DOM sibling (inline math)

Observed in `.markdown > p` rendered body, immediately before a `.katex` span.

```html
<script type="math/tex">\frac{x_1^2}{y_2^3}</script>
<span class="katex">...</span>
```

Extractor action: read `script.textContent` directly → `{ type:"math", latex:"\\frac{x_1^2}{y_2^3}", display:false, source:"chatgpt:script" }`.

### Snippet C — Hidden `.katex-mathml` annotation node

Observed when script tags are stripped but KaTeX fallback renderer is active. Use this as fallback anchor.

```html
<span class="katex">
  <span class="katex-mathml" style="position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(1px,1px,1px,1px);">
    <math xmlns="http://www.w3.org/1998/Math/MathML">
      <semantics>
        <mrow><msub><mi>μ</mi><mi>x</mi></msub><mo>=</mo><mfrac><msub><mi>p</mi><mi>y</mi></msub><msub><mi>p</mi><mi>x</mi></msub></mfrac><mo>−</mo><mn>6</mn></mrow>
        <annotation encoding="application/x-tex">\mu_x = \frac{p_y}{p_x} - 6</annotation>
      </semantics>
    </math>
  </span>
  <span class="katex-html" aria-hidden="true">...visual spans...</span>
</span>
```

Extractor action: `querySelector('.katex-mathml annotation[encoding="application/x-tex"]').textContent` → `"\\mu_x = \\frac{p_y}{p_x} - 6"`. Determine `display` boolean by checking whether the outer `.katex` container has `display:block` or sits inside a block-level parent (`p` → inline; `div.math-display` or standalone after paragraph → display).

### Snippet D — 2×2 matrix via copy-button payload

```
A 2×2 example:

$$
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
$$

Its inverse is $\frac{1}{ad - bc}$.
```

Extractor should preserve multi-line `\begin{bmatrix}...\end{bmatrix}` body with newlines intact → MathJax needs newlines inside AMS environments.

### Snippet E — Manual-selection-copy fallback output (poorer quality)

Manual drag-select over the same Snippet A response produces `text/plain` like:

```
To derive the expectation μₓ = p_y/p_x − 6, start from the definition:

𝔼[X] = Σk=1∞ k · P(X=k)
```

Delimiters lost; commands collapsed to glyphs. In this case `extractFromText()` returns **no math segments** (correctly — there are no delimitered snippets). Downstream UX must flag "No recoverable LaTeX in paste — please use the ChatGPT copy-button icon instead" and allow user to paste copy-button text directly.

## Word Notes

Pasting ChatGPT output directly into Word **never produces native OMML equations** because neither hidden MathML nor clipboard CF_MathML are set. The HTML fragment contains `class="katex"` spans but Word has no KaTeX engine and falls back to the inline Unicode spans. To achieve native equations, downstream steps must: recover LaTeX → MathML → OMML, then inject via **Paste Special (HTML with embedded MathML/OMML)** or via **Word Add-in using `Range.insertOoxml()`**.
