# Word Delivery Prototypes

**Owner:** Cursor (Word Delivery Specialist)  
**Last updated:** 2026-08-19

## MVP route recommendation for Codex

**Recommendation: Dual-route MVP**

| Route | Entry point | Best for | Determinism |
|-------|-------------|----------|-------------|
| **DOCX file** | `npm run fixture` → open `dist/sample.docx` | Fastest proof, no clipboard quirks | **Highest** |
| **Clipboard (MathML HTML)** | UI **Copy for Word** or `dist/sample.html` | In-document paste without file open | Medium |
| **Clipboard (Notion HTML/Markdown)** | UI **Copy for Notion** | Notes databases/pages that should preserve headings, lists, code, and LaTeX text | Medium |
| **Add-in (insertOoxml)** | Download OOXML + `addin-insert.js` | User already in Word | High (desktop) |

1. **Primary user path:** generate `.docx` and open in Word (Codex CLI).
2. **Secondary path:** Word-optimized HTML clipboard paste (Cursor `clipboard-from-segments.mjs`).
3. **Notes path:** Notion-optimized semantic HTML plus Markdown fallback.
4. **Future path:** Word Add-in using OMML OOXML fragments.

---

## Codex baseline (integrated)

Root CLI produces three artifacts per conversion:

```text
npm run convert -- --input samples/sample-ai-response.md --out dist/sample
```

| Output | Purpose |
|--------|---------|
| `dist/sample.html` | MathML-rich HTML + **Copy Rich HTML** button |
| `dist/sample.docx` | Native OMML Word document — **open directly in Word** |
| `dist/sample.document.xml` | Raw WordprocessingML for inspection / add-in prototyping |

Cursor delivery layer wraps the same `convertAiResponse()` pipeline via `delivery-bridge.js`.

---

## Prototype A: Clipboard route (HTML + MathML)

### Winning strategy

Word reads **bare Presentation MathML** from `text/html` and converts to native OfficeMath via internal `mml2omml.xsl`.

```text
text/html  → <math xmlns="http://www.w3.org/1998/Math/MathML">…</math> (no OMML wrapper)
text/plain → LaTeX fallback ($…$ / $$…$$)
```

**Avoid:** OMML inside HTML on clipboard — Word writes OMML outbound but does not reliably import third-party OMML-in-HTML paste.

### Implementation

| File | Role |
|------|------|
| `clipboard-from-segments.mjs` | Word-optimized HTML from converted segments (bare `<math>`, no span/div wrappers) |
| `clipboard-mathml.js` | Browser ClipboardItem API + CF_HTML wrapper (legacy demo) |
| `demo.html` | Fixture-only clipboard test page |

### Codex vs Cursor clipboard difference

| Source | HTML shape | Word paste expectation |
|--------|------------|------------------------|
| Codex `segmentsToHtml` | `<span class="math-inline">` / `<div class="math-display">` wrapping MathML | May work; wrappers add noise |
| Cursor `buildWordClipboardHtml` | Bare `<math>` inline in body | Preferred per EquaPaste / Microsoft interop research |

Trae should A/B test both on desktop Word and record in `docs/PHASE_0_MANUAL_TEST_CHECKLIST.md`.

### Expected desktop Word behavior

| Payload | Expected | Confidence |
|---------|----------|------------|
| Word-optimized MathML HTML | Native editable equation | High |
| Plain MathML as `text/plain` | Native editable equation | Medium–High |
| OMML in HTML | Nothing or literal XML | Avoid |
| Raw LaTeX as `text/plain` | Literal `\frac{a}{b}` | Low |

### Word Online caveat

Body paste does not convert math reliably. Workaround: Alt+= (equation editor), then paste MathML inside.

---

## Prototype B: DOCX route (recommended primary)

Codex `docx.mjs` builds a minimal ZIP package with OMML in `word/document.xml`.

**User flow:** `npm run fixture` → open `dist/sample.docx` in desktop Word → verify equations are editable.

This is the most deterministic MVP path because it bypasses clipboard format detection entirely.

---

## Prototype C: Word Add-in route (`insertOoxml`)

### Files

| File | Role |
|------|------|
| `ooxml-builder.js` | Wrap OMML in `w:p` / `m:oMathPara` |
| `addin-insert.js` | `insertEquationAtSelection()`, `insertDocumentSegments()` |
| `docx.mjs` | Full DOCX generation (also usable for add-in OOXML source) |

### API

```ts
Word.run(async (context) => {
  const range = context.document.getSelection();
  range.insertOoxml(ooxmlFragment, Word.InsertLocation.replace);
  await context.sync();
});
```

### Host support

| Host | Status |
|------|--------|
| Word Desktop (Win/Mac) | Reliable for single/multiple equations |
| Word Online | Buggy with multiple OMML in one paragraph ([office-js#1448](https://github.com/OfficeDev/office-js/issues/1448)) |

**Blocked:** Add-in manifest scaffold — Codex owns `package.json` / manifest registration.

---

## Prototype D: Manual-input UI

### Run

```powershell
# Root CLI (recommended)
npm run fixture

# Interactive UI
node src/word-delivery/local-server.js
# http://localhost:4173
```

### UI flow

1. Paste AI response text.
2. **Convert** — preview bare MathML, error panel for unsupported LaTeX.
3. **Copy for Word** / **Copy for Notion** / **Download DOCX** / **Download HTML** / **Download OOXML**.

### Notion clipboard route

`Copy for Notion` writes semantic `text/html` and a Markdown `text/plain` fallback. It is intended to preserve AI-response structure such as headings, bullet lists, numbered lists, blockquotes, fenced code blocks, inline code, bold text, links, and LaTeX delimiters. Equation editability depends on Notion's paste handling; the route preserves the LaTeX source so equations can still be converted or edited after paste.

### Files

```
src/word-delivery/
  delivery-bridge.js         # convertAiResponse → delivery artifacts
  clipboard-from-segments.mjs
  docx.mjs                   # DOCX builder (Codex)
  local-server.js            # UI + POST /api/convert
  generate-artifacts.js      # CLI wrapper
  manual-qa.md               # Word desktop QA checklist
src/ui/
  index.html, app.js, styles.css
```

---

## End-to-end pipeline

```text
AI response text
  → parseAiResponse()          [src/conversion/segments.mjs]
  → latexToMathMl / latexToOmml  [src/conversion/]
  → ┬─ DOCX (docx.mjs)           → open in Word
    ├─ HTML clipboard            → paste in Word
    └─ OOXML fragment            → insertOoxml (add-in)
```

---

## Open validation (Trae)

- [ ] Paste matrix: Codex `dist/sample.html` Copy Rich HTML → Word
- [ ] Paste matrix: Cursor UI Copy for Word → Word
- [ ] Open `dist/sample.docx` — all fixture equations editable
- [ ] Word version / OS / browser recorded in Phase 0 checklist

---

## RECOMMENDATION logged for Codex

**Title:** Ship DOCX-first MVP, clipboard second

**Reason:** DOCX route is already working, deterministic, and requires zero clipboard API permissions. Clipboard remains valuable for in-flow paste but should not block MVP acceptance.

**Tradeoff:** DOCX requires file open step; clipboard is faster for power users.

**Affected files:** `docs/USER_GUIDE.md`, product messaging

**Can continue without User:** yes
