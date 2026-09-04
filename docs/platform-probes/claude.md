# Claude (Anthropic) Platform Probe Report

**Date:** 2026-08-19
**OS:** Windows 10/11 (testing target)
**Word Version:** Microsoft Word 365 Desktop (16.x)
**Browser:** Chrome / Edge (latest)
**Platform:** claude.ai (Claude 3 / Claude 3.5 Sonnet / Opus web UI)

## Summary

Claude's web UI renders math responses using client-side rendering (often MathJax v3 or a custom markdown→HTML pipeline). Unlike ChatGPT's "copy text" payload, Claude's default copy button historically returns **raw markdown with dollar-delimited LaTeX preserved**, which is excellent for source recovery. Rendered DOM usually contains a visible MathML node (not hidden) with a `<semantics><annotation encoding="application/x-tex">...</annotation>` child. Word paste from Claude: **Unicode text on normal paste, occasionally MathML fragments survive via HTML paste path depending on browser**, but Word still does not create OMML equations automatically.

## Results Table

| Test | Normal Paste | Paste Special: HTML | Paste Special: Unformatted Text |
| --- | --- | --- | --- |
| Inline math `mu_x = p_y / p_x - 6` | Unicode μₓ with subscripts, slashes, minus — no OMML equation | HTML-classed spans; identical visual appearance in Word | Markdown `$mu_x = p_y / p_x - 6$` or raw `\mu_x = p_y / p_x - 6` depending on copy method |
| Display math (centered derivation) | Centered Unicode block separated by line breaks | Block-level container; some border/padding from Claude UI | LaTeX with `$$...$$` or `\[...\]` preserved |
| Fraction `x_1^2 / y_2^3` | Unicode super/sub on one line or split inline with `/`; no stacked fraction | Same visual; not native Word fraction | Plain `x_1^2 / y_2^3` or in `$...$` |
| Greek letters α, β, μ, Σ | Unicode α β μ Σ correct | Same Unicode | Unicode or LaTeX command names |
| 2×2 matrix | Unicode bracket + tab-separated cells `[ a b ; c d ]` style, or raw LaTeX pmatrix | HTML `<table>`-like visual wrapper; not an equation matrix | `\begin{pmatrix}...\end{pmatrix}` source reliably preserved by copy button |
| Mixed paragraph (prose + inline + display) | Prose preserved with markdown bold/italic → Word formatting; inline math = Unicode; display = block raw LaTeX or Unicode | Prose formatting nicer; same math caveat | Full markdown `$...$` / `$$...$$` retained when using Claude copy button (preferred) |

**Result Label Summary:** `Unicode text + Raw LaTeX (especially via copy button)`.

## DOM Inspection Notes

Target: one inline and one display equation under Claude's `data-is-streaming="false"` assistant container.

### Rendered math element structure (Claude 3.5 Sonnet / claude.ai as of 2024–2026)

Two rendering modes have been observed. Older rollouts use MathJax v3; newer simplified UI uses custom `<span>` math with hidden source.

#### Pattern A — MathJax v3 rendering (most common)

```
.prose
  └─ mjx-container[display="true" | "false"]
       ├─ svg > g > path              # Visible glyphs (SVG path based)
       └─ math[xmlns="http://www.w3.org/1998/Math/MathML"]  # OFTEN in light DOM or slot
            └─ semantics
                 ├─ mrow / mfrac / msup / ...   # Presentation MathML
                 └─ annotation encoding="application/x-tex"   # RAW LATEX HERE
```

Key observations for Pattern A:
1. **`<math>` tag:** YES. Exists inside or alongside `mjx-container`. If not visible in light DOM, inspect the shadow root of `mjx-container` (MathJax v3 uses Shadow DOM by default).
2. **`<annotation encoding="application/x-tex">`:** YES inside `<semantics>` and holds the authoritative LaTeX source.
3. **Extractor note:** Because of Shadow DOM encapsulation, clipboard extractors injected into the page **must use `element.shadowRoot.querySelector(...)`** to reach the annotation; a top-level `document.querySelectorAll('annotation')` misses them.

#### Pattern B — Custom span math (newer simplified rendering, mobile / feature toggled)

```
.prose
  └─ span.math-inline OR div.math-display
       ├─ span (styled Unicode glyphs, classes like `sub`, `sup`)
       └─ PREVIOUS / NEXT sibling: <script type="math/tex"> or <script type="math/tex; mode=display">
```

Key observations for Pattern B:
1. **`<math>` tag:** NO semantic math in DOM; purely visual HTML spans.
2. **`<annotation>` absent entirely;** the semantic source lives in a sibling `<script type="math/tex">` tag, identical to the ChatGPT markdown pipeline.
3. **Extractor note:** In this pattern, **always harvest `<script type="math/tex">` first** — it's the cheapest 100%-accurate source.

### Copy button vs manual selection

- **Copy button (top-right of Claude message card):** Highest quality. Returns the assistant response **re-serialized as markdown**, with inline math wrapped in `$...$` and display math wrapped in `$$...$$` (or occasionally `\[...\]`). This is the cleanest input for the downstream LaTeX → MathML → OMML pipeline. Paste as text directly.
- **Ctrl+Shift+C "Copy as Markdown" (some builds):** Explicitly returns markdown; same excellent payload.
- **Manual drag-select + Ctrl+C:** Hit-and-miss for math. Picks up SVG/MathJax visual nodes but the `<annotation>` is often stripped by the browser's text-fragment generator. The `text/html` fragment may contain `<mjx-container>` but Word ignores it. Delimiters and source commands lost.
- **Conclusion:** Prefer the **copy button payload (`text/plain` + markdown) over DOM extraction**. DOM extraction is a fallback for browsers/extensions that only get visual selection. If implementing a browser extension, hook into Claude's internal `navigator.clipboard.writeText` or read the message's internal state via `data-message-id` DOM attribute to fetch the original markdown text.

## Recommended Extraction Strategy (Priority Order)

1. **Clipboard text scan (highest priority).**
   - Look for `$...$`, `$$...$$`, `\begin{*}...\end{*}`, `\[...\]`.
   - Use the copy-button first: users should be trained to click Claude's "Copy" button.
2. **DOM: `<script type="math/tex">` siblings in `.prose`.**
   - Simple DOM query, no Shadow DOM traversal.
3. **DOM: `mjx-container` with Shadow DOM drill-down.**
   - For each `mjx-container`, check `container.shadowRoot?.querySelector('annotation[encoding="application/x-tex"]')?.textContent`.
4. **Normalize delimiters** to canonical `$inline$` / `$$display$$` before conversion.
5. **Special handling for matrices and aligned environments:** Claude copy-button payloads often output multi-line LaTeX (`\begin{align}...\end{align}`). These must be preserved as multi-line strings when passed to MathJax conversion; do NOT trim or collapse newlines prematurely.

## Sample Captured Source Snippets

All snippets sanitized: prompts, project names, org IDs removed. Only AI output shown.

### Snippet A — Copy-button markdown payload (best-in-class source)

Source: Claude 3.5 Sonnet, message-card "Copy" icon. The copy-button re-serializes the original markdown directly; visual HTML never touches it.

```
## Short Derivation

Let inline expression $x_1^2 / y_2^3$ be the ratio. The centred integral is:

$$
\int_0^1 \frac{\alpha + \beta}{\mu_x}\, d\mu = \Sigma_{i=1}^{N} \frac{i^2}{i+1}
$$

### 2×2 Matrix

$$
A = \begin{pmatrix}
a_{11} & a_{12} \\
a_{21} & a_{22}
\end{pmatrix}, \quad
A^{-1} = \frac{1}{\det A} \begin{pmatrix}
a_{22} & -a_{12} \\
-a_{21} & a_{11}
\end{pmatrix}
$$

Mixed paragraph: Let $f(x) = x^2 + \alpha x + \beta$ and suppose $x \in [0, 1]$. Then the mean value
\[
\mathbb{E}[f] = \int_0^1 f(x)\, dx = \frac{1}{3} + \frac{\alpha}{2} + \beta
\]
concludes the proof.
```

Expected extractor output (10+ math segments): mixed `dollar:inline`, `dollar:display`, and `bracket:display` sources, with `ams:pmatrix` and `\frac`, `\int`, Greek letters all preserved verbatim.

### Snippet B — Pattern A (MathJax v3 `mjx-container` with Shadow DOM)

Rendered light DOM (before shadow drill):

```html
<div class="prose">
  <p>Let the ratio be
    <mjx-container display="false" jax="CHTML">
      #shadow-root (open)
        <mjx-assistive-mml role="presentation" unselectable="on" display="false">
          <math xmlns="http://www.w3.org/1998/Math/MathML">
            <semantics>
              <mrow><mfrac><msubsup><mi>x</mi><mn>1</mn><mn>2</mn></msubsup><msubsup><mi>y</mi><mn>2</mn><mn>3</mn></msubsup></mfrac></mrow>
              <annotation encoding="application/x-tex">\frac{x_1^2}{y_2^3}</annotation>
            </semantics>
          </math>
        </mjx-assistive-mml>
        <!-- CHTML SVG-style rendered glyphs in shadow -->
    </mjx-container>
  inline inside prose.</p>
</div>
```

Extractor action (pseudocode from `src/source-extractors/selector-cheatsheet.js`):

```js
const container = document.querySelector('mjx-container[display="false"]');
const mathEl = container.shadowRoot.querySelector('annotation[encoding="application/x-tex"]');
const latex = mathEl?.textContent; // → \frac{x_1^2}{y_2^3}
```

**Common pitfall:** Plain `document.querySelectorAll('annotation')` returns **zero matches** because the annotation lives inside a Shadow DOM subtree. Always access `container.shadowRoot`.

### Snippet C — Pattern B (newer simplified UI: `<script type="math/tex">` siblings)

Observed in rollouts where Claude replaced MathJax v3 rendering with a custom lightweight renderer:

```html
<div class="prose markdown-main">
  <script type="math/tex">\alpha + \beta = \gamma</script>
  <span class="math-inline"><span class="sub">α</span> + <span>β</span> = <span>γ</span></span>
  <p>Continuing prose here.</p>
  <script type="math/tex; mode=display">\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}</script>
  <div class="math-display">[…styled Unicode block…]</div>
</div>
```

Extractor action: `querySelectorAll('script[type="math/tex"], script[type="math/tex; mode=display"]')` — reads the `textContent` verbatim; fastest path.

### Snippet D — Aligned environment in copy-button text

Claude uses `\begin{align*}...\end{align*}` heavily when user asks for "show steps." This must be preserved multi-line:

```
Starting from $a^2 + b^2 = c^2$,

\begin{align*}
c &= \sqrt{a^2 + b^2} \\
  &= \sqrt{3^2 + 4^2} \\
  &= \sqrt{25} = 5.
\end{align*}

Thus $c=5$.
```

`extractFromText()` returns:
```
text  "Starting from "
math  latex="a^2 + b^2 = c^2"                          display=false  source=dollar:inline
text  ",\n\n"
math  latex="\begin{align*} c &= \sqrt{a^2 + b^2} \\ &= \sqrt{3^2 + 4^2} \\ &= \sqrt{25} = 5. \end{align*}"  display=true  source=ams:align*
text  "\n\nThus "
math  latex="c=5"                                       display=false  source=dollar:inline
text  "."
```

### Snippet E — Manual-drag-select output (degraded)

Manual select on the Pattern A rendered page yields `text/plain` with glyphs only:

```
Let the ratio be x₂³
x₁²
 inline inside prose.
```

No delimiters, no commands, fraction visually stacked as two lines. `extractFromText()` correctly returns **0 math segments**. UX should surface: "Detected Claude manual selection. Please use the Copy button in the top-right of each Claude answer for recoverable equations."

## Word Notes

Paste into Word from Claude does **not** yield native equations even though Pattern A DOM carries legitimate `<math>` — because (a) Word's HTML paste filter drops unknown SVG/MathML, or (b) the `<annotation>` is inside a Shadow DOM subtree the serializers never expose. The safest interoperable path: accept the copy-button markdown payload → extract/normalize LaTeX → convert to MathML via MathJax → convert MathML to OMML via MML2OMML.xsl → deliver to Word via clipboard OOXML injection (see Cursor's Word delivery prototypes).
