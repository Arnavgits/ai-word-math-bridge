# Technical Architecture

## Core Pipeline

```text
AI platform
  -> source extractor
  -> raw markdown/LaTeX
  -> equation segment parser
  -> MathJax TeX to MathML
  -> MathML to OMML transform
  -> Word delivery adapter
```

## Components

### 1. Source Extractors

Each platform gets a probe and later an extractor:

- ChatGPT.
- Claude.
- Gemini.

Extractor priority:

1. Network/source interception.
2. DOM semantic extraction.
3. Rendered DOM reconstruction.
4. OCR fallback.

### 2. Equation Segment Parser

Input: raw markdown text.

Output: ordered document segments:

```ts
type Segment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean };
```

The parser should preserve text order, inline/display placement, and original delimiters only as metadata.

### 3. Math Conversion

Preferred route:

```text
LaTeX -> MathML with MathJax
MathML -> OMML with MML2OMML.xsl or compatible XSLT transform
```

Test fixtures must include:

- Inline equation.
- Display equation.
- Fraction with subscript/superscript.
- Greek letters.
- Matrix.
- Mixed prose plus inline math.

### 4. Word Delivery Adapters

#### Clipboard Adapter

Writes `text/html` with embedded MathML to the clipboard and tests whether desktop Word imports it as native equations.

#### Word Add-in Adapter

Uses Office.js to insert OOXML containing OMML:

```text
OMML -> OOXML package fragment -> Range.insertOoxml()
```

This is expected to be more deterministic than clipboard behavior.

## Main Risk Register

- AI platforms may not expose raw LaTeX in the DOM.
- Network interception may differ across browsers and platform updates.
- Word paste behavior may differ between Windows, Mac, and web Word.
- `MML2OMML.xsl` availability may vary by environment.
- Browser clipboard APIs may restrict rich clipboard MIME types.

## Initial Recommendation

Run Phase 0 before writing heavy product code. If Word already accepts MathML-rich HTML from one or more platforms, the MVP can be a lighter clipboard bridge. If paste behavior is unreliable, prioritize the Word Add-in route.
