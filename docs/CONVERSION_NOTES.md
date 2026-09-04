# Conversion Notes

VS Code AI owns this file.

## Current Codex Baseline

Codex has created a dependency-free MVP conversion baseline so the tool can run immediately:

```text
pasted AI response -> segment parser -> small LaTeX AST -> MathML HTML -> direct OMML DOCX
```

This is not the final MathJax/MML2OMML proof. It is a working fallback route that supports common MVP fixtures:

- Inline math.
- Display math.
- Fractions.
- Subscripts and superscripts.
- Greek commands such as `\alpha`, `\beta`, `\mu`, `\Sigma`.
- Basic matrices with `matrix`, `bmatrix`, `pmatrix`, `cases`, or `array`.

## VS Code AI Next Work

Replace or augment the baseline with the preferred proof:

```text
LaTeX -> MathML via MathJax
MathML -> OMML via MML2OMML.xsl or compatible transform
```

Keep the existing public behavior and tests passing unless Codex updates the interface.

The conversion module now also exports `parseAiResponse(input)`. It scans left
to right, preserves ordered prose and math segments, supports `\\(...\\)`,
`\\[...\\]`, `$...$`, and `$$...$$`, and leaves unmatched delimiters as text.

Unsupported TeX is reported as an explicit `Unsupported LaTeX` error when
MathJax emits an `merror`, rather than being passed downstream as invalid math.
The MathJax proof also normalizes CRLF input and common `\\dfrac`/`\\tfrac`
aliases to `\\frac` before conversion.
The fixture tests use ESM-compatible `.js` files because the repository root is
configured with `"type": "module"`; the conversion package remains CommonJS.

## Open Questions

- Where will `MML2OMML.xsl` come from in the target environment?
- Should the transform run client-side, in a local helper service, or inside a Word Add-in?
- What MathJax output settings preserve the semantics Word needs most reliably?
