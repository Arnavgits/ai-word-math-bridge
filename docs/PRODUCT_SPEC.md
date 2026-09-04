# Product Spec: AI Word Math Bridge

## Problem

AI assistants often render mathematical answers beautifully in the browser, but pasting those answers into Microsoft Word may produce plain text, broken formatting, images, Unicode approximations, or raw LaTeX instead of native editable Word equations.

## Target Outcome

Users should be able to move math-heavy AI responses into Word while preserving:

- Editable Word equations.
- Surrounding prose formatting.
- Inline and display equation placement.
- Common structures such as fractions, subscripts, superscripts, Greek letters, matrices, and cases.

## Technical Thesis

Treat the project as a deterministic conversion pipeline:

```text
AI response -> raw LaTeX -> MathML -> OMML -> Word
```

The conversion stages should use established tooling. Do not hand-write a LaTeX parser and do not ask an LLM to guess equation structure when exact source can be recovered.

## Product Scope

### Phase 0: Premise Verification

Manually test ChatGPT, Claude, and Gemini by copying the same math-containing responses into desktop Word. Record whether each paste becomes native equations, Unicode text, raw LaTeX, or broken output.

### Phase 1: Source Recovery

Identify the best extraction route per platform:

1. Raw network response or streaming payload.
2. DOM MathML or TeX annotation.
3. Rendered DOM reconstruction.
4. OCR only as a last resort.

### Phase 2: Conversion Proof

Prove:

```text
LaTeX -> MathML -> OMML
```

using fixture equations that cover inline math, display math, fractions, superscripts, subscripts, Greek letters, matrices, and mixed prose.

### Phase 3: Word Delivery

Evaluate two viable delivery routes:

- Clipboard route: write HTML containing MathML to the `text/html` clipboard representation and test Word paste behavior.
- Word Add-in route: transform MathML to OMML and insert OOXML through Office.js `Range.insertOoxml()`.

## MVP Acceptance Criteria

- At least one complete fixture reaches Word as a native editable equation.
- The source recovery feasibility for ChatGPT, Claude, and Gemini is documented.
- The project recommends either clipboard-first, add-in-first, or dual-route delivery based on evidence.
- The conversion path is repeatable without manual equation rewriting.
