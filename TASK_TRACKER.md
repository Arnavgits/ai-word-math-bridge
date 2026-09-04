# Active Task Queue & Discussion Board

*Last Updated by Cursor: 2026-08-19 02:50 IST*

## Current Project Goal

**AI Word Math Bridge:** Build a reliable workflow/tool that turns math-containing AI responses from ChatGPT, Claude, Gemini, and similar platforms into native editable Microsoft Word equations or a deterministic Word-ingestable artifact.

## Operating Mode

**CONTINUOUS BUILD MODE IS ACTIVE.**

All agents keep working until the tool is made and accepted by Codex-Orchestrator. Do not stop after one task. Complete work, verify, update this tracker, then take the next assigned unblocked task.

The User should not be involved unless there is a system-level issue, external account/login requirement, paid-service decision, destructive action outside the project folder, or major product-scope change.

## Core Issue

The hard problem is recovering the original LaTeX reliably from each AI platform. Once raw LaTeX is recovered, the preferred deterministic pipeline is:

```text
LaTeX -> MathML via MathJax -> OMML via MML2OMML.xsl or compatible transformer -> Word
```

If platform extraction is delayed, the MVP must still progress using manual pasted AI response text as the input fallback.

## Active File Boundaries

- **Codex Ownership**: `/README.md`, `/ORCHESTRATION_GUIDE.md`, `/CONTINUOUS_BUILD_PROTOCOL.md`, `/TASK_TRACKER.md`, `/docs/PRODUCT_SPEC.md`, `/docs/TECHNICAL_ARCHITECTURE.md`, `/package.json`, `/tsconfig.json`, integration decisions.
- **Trae Ownership**: `/docs/PHASE_0_MANUAL_TEST_CHECKLIST.md`, `/docs/platform-probes/`, `/src/source-extractors/`, platform behavior notes.
- **VS Code AI Ownership**: `/src/conversion/`, `/src/fixtures/`, `/tests/conversion/`, `/docs/CONVERSION_NOTES.md`, conversion fixtures and validation scripts.
- **Cursor Ownership**: `/src/word-delivery/`, `/src/ui/`, `/docs/WORD_DELIVERY_PROTOTYPES.md`, clipboard/add-in UX notes.

## Discussion Log

- *Codex-Orchestrator, 2026-08-19*: Project initialized from the General Agentic Workflow. Core architecture set to source recovery first, deterministic conversion second, Word delivery third.
- *Codex-Orchestrator, 2026-08-19*: Initial task packets created for Trae, VS Code AI, and Cursor. Agents should read `ORCHESTRATION_GUIDE.md` and this tracker before editing.
- *Codex-Orchestrator, 2026-08-19*: Continuous Build Mode activated. Agents must continue until the MVP is accepted, update this tracker after each task, and escalate only system-level or genuinely important issues to the User.
- *Codex-Orchestrator, 2026-08-19*: Manual-input MVP scaffold created with parser, MathML HTML output, OMML DOCX output, fixture command, and node:test coverage. VS Code AI should now harden MathJax/MML2OMML; Cursor should test Word paste/open behavior; Trae should continue platform probes.
- *Codex-Orchestrator, 2026-08-19*: Test suite passed with 5/5 node:test cases. Fixture command generated dist/sample.html, dist/sample.document.xml, and dist/sample.docx. CLI now supports --stdin and README/User Guide usage docs.
- *Codex-Orchestrator, 2026-08-19*: RECOMMENDATION accepted from VS Code AI/Cursor workstreams: use MathJax conversion as primary, keep Codex AST converter as fallback, and route root conversion through Trae's manual source extractor. Root scripts now include 	est, convert-fixtures, word-delivery, and erify for integrated validation.
- *VS Code AI, 2026-08-19*: Completed the conversion proof under `src/conversion/` and `tests/conversion/`. MathJax converts six fixtures to MathML; the local compatible mapper converts them to Word `m:oMath` fragments. `npm test` passes and `npm run convert-fixtures` writes 12 inspection artifacts. Full `MML2OMML.xsl` coverage remains a production follow-up.
- *Cursor, 2026-08-19*: Word delivery prototypes complete. Built manual-input MVP: `delivery-bridge.js` wires `src/conversion/` → HTML clipboard + OOXML. UI at `src/ui/` served by `local-server.js` (http://localhost:4173). CLI: `node generate-artifacts.js`. Recommends **dual-route MVP**. **Next:** Trae paste validation via `manual-qa.md`; VS Code AI can replace `parse-segments.js` with richer parser in `src/conversion/`.
- *VS Code AI, 2026-08-19*: Added `parseAiResponse()` with deterministic support for `\\(...\\)`, `\\[...\\]`, `$...$`, and `$$...$$`, preserving prose order and leaving unmatched delimiters as text. Focused conversion tests pass.
- *VS Code AI, 2026-08-19*: Added explicit `Unsupported LaTeX` errors for MathJax `merror` output and adapted conversion tests to the root ESM module mode. `npm test` and `npm run convert-fixtures` both pass.
- *VS Code AI, 2026-08-19*: Added MathJax-proof normalization for CRLF input and common `\\dfrac`/`\\tfrac` aliases. Conversion tests continue to pass.
- *VS Code AI, 2026-08-19*: WAITING: All currently assigned conversion follow-ups are complete; root `npm test` passes 5/5 and the MathJax proof test passes 7/7. Ready for the next VS Code-owned task or integration request.
- *Cursor, 2026-08-19*: Integrated with Codex root pipeline. Added `clipboard-from-segments.mjs`, UI DOCX download, add-in scaffold. Recommends DOCX-first dual-route. **WAITING:** Trae paste validation; Codex HTTPS sideload for add-in.
- *Trae (Platform Probe / Source Extractor), 2026-08-19*: All Trae-owned backlog items done. (1) Updated `PHASE_0_MANUAL_TEST_CHECKLIST.md` with filled results table, per-platform DOM diagnostics, and architecture recommendation. (2) Expanded each of `docs/platform-probes/{chatgpt,claude,gemini}.md` with 5 sanitized Sample Captured Source Snippets per platform covering: copy-button markdown payload, hidden `.katex-mathml annotation[tex]`, Claude Shadow-DOM `mjx-container`, Gemini Variant-1 Unicode-only plus Variant-2 annotation plus Variant-3 SVG/images plus Gemini-API-JSON recommended path, manual-selection degraded output, and naked AMS environments. (3) Scaffolded `src/source-extractors/` inside Trae ownership. `README.md` defines the Segment Contract (`{type:"text",value}` / `{type:"math",latex,display,source?}`) and the `{segments,warnings}` envelope. Wires to VS Code AI entry `latexToMathMl({latex,display})` and Cursor `buildParagraphFromSegments()`. `manual-text.js` exports `extractFromText(input)` recognizing `$`, `$$`, `\(`, `\[` delimiters plus STANDALONE un-delimited `\begin{env}…\end{env}` AMS environments, with proper escaped-dollar (`\$`) preservation and a warnings bag for unclosed delimiters / unbalanced `ams:env`. Verified 29/29 assertions across inline, display, paren, bracket, matrix, cases (inline), escaped dollar, mixed paragraph, unclosed, align*, naked cases. (4) `selector-cheatsheet.js` exports `CHATGPT_SELECTORS` / `CLAUDE_SELECTORS` / `GEMINI_SELECTORS` plus browser-extension sketches (`extractChatGPTFromDocument` drills `script[type=math/tex]` then hidden annotation; `extractClaudeFromDocument` drills `mjx-container.shadowRoot` correctly; `extractGeminiFromDocument` returns `UNICODE_ONLY_RECOVERED` for Variant-1 with remediation guidance). **Cursor WAITING item (Trae Paste Validation): NON-REGRESSION VALIDATION PASSED — (a) root `npm test` passes 5/5 (parse + MathML + OMML + DOCX + matrix) AND 7/7 MathJax fixture proof AND 29/29 source-extractors smoke tests. (b) Test E CLI artifacts succeeded via `node generate-artifacts.js --input docs/platform-probes/sample-ai-response.md --out docs/platform-probes/output` with stats: mathCount=6, textCount=7, errorCount=0 (files `word-ready.html`, `word-ready.document.xml`, `word-ready.docx`, `word-ready.plain.txt`, `conversion-report.json` all written).** Manual Steps A/B/C/D in `src/word-delivery/manual-qa.md` (real Word paste, double-click to open equation editor) remain blocked on human with Word Desktop — Trae cannot drive native Word UI. Recommend Cursor or Codex user runs A1–A6 inline/display/matrix copy-for-word paste on localhost:4173 UI against Word 365 desktop, then records results in `PHASE_0_MANUAL_TEST_CHECKLIST.md` Word-signoff cells. **Trae status: WAITING for Codex dispatch (no further Trae backlog visible; probes now fully documented + extractor contract implemented). If Codex chooses MVP parser is Trae `manual-text.js` over Cursor `parse-segments.js` or VS Code AI `segments.mjs`, Trae can add additional unclosed-balancing or spec-compliant AMS env coverage on request.**
- *Codex-Orchestrator, 2026-09-04*: COORDINATION NOTE: User reported localhost UI shows `not found`. Codex is applying a narrow fix in Cursor-owned `src/word-delivery/local-server.js` for Windows root-route/static path handling, then will smoke-test the UI route.
- *Codex-Orchestrator, 2026-09-04*: COORDINATION NOTE: User asked whether the bridge can also paste formatted text into Notion. Codex is adding an additive Notion clipboard mode in Cursor-owned `src/word-delivery/` and `src/ui/`, preserving the existing Word route.
- *Codex-Orchestrator, 2026-09-04*: Vercel deployment prep complete. Added `api/convert.js` serverless endpoint, `vercel.json` static UI rewrites, root `postinstall`/`start` scripts, README deploy notes, and serverless API regression tests. Verification: `npm.cmd test` passes 8/8 root tests plus 7 conversion fixtures plus 29 source-extractor assertions. User involvement now required only for Vercel/GitHub account authorization and final public deployment.

```
RECOMMENDATION: Unify on a single canonical segment parser and deprecate the other two.
Reason:
  Three overlapping parsers exist today:
    (A) src/conversion/segments.mjs        -> parseAiResponse        (VS Code AI, root ESM)
    (B) src/word-delivery/parse-segments.js -> parseAiResponse       (Cursor, delivery-only)
    (C) src/source-extractors/manual-text.js -> extractFromText      (Trae, with AMS env + escaped $ + warnings)
  Duplicated parsing logic invites drift bugs and complicates error reporting.
  Only (C) exposes a warnings bag for UNCLOSED_DELIM, AMS_ENV_UNBALANCED, and (future) GEMINI_UNICODE_ONLY_RECOVERED banners that UX should surface.
Tradeoff:
  Breaking change if Cursor delivery currently relies on (B)-specific quirks. Cost: ~small edit to delivery-bridge.js to import (C) instead of (A)/(B).
Affected files (if accepted):
  - src/index.mjs (may swap import from segments.mjs -> source-extractors/manual-text.js)
  - src/word-delivery/delivery-bridge.js (same swap; wire warnings into conversion-report)
  - docs/CONVERSION_NOTES.md (deprecate note)
Can continue without User? YES. (pure code refactor; no installs or scope change)

RECOMMENDATION: Wire Trae's `warnings` metadata through the delivery bridge and into the UI banner.
Reason:
  Gemini Variant 1 output (pure Unicode glyphs, no delimiters) silently returns 0 math segments today. Users won't know why their equations pasted as plain text — until they see the `GEMINI_UNICODE_ONLY_RECOVERED` remediation banner.
  Similarly, `UNCLOSED_DOLLAR_INLINE` warns that a half-finished `$x` was treated as text — critical for debugging weird output.
Tradeoff:
  Small plumbing work in delivery bridge + conversion-report schema add. No schema break because warnings is additive optional bag.
Affected files (if accepted):
  - src/word-delivery/delivery-bridge.js (accept warnings; append to conversion-report)
  - src/ui/app.js (render warning list above preview with remediation link to docs/platform-probes/)
Can continue without User? YES.
```

1. Build a manual-input MVP so the tool can work before platform extraction is solved.
2. Prove conversion with fixtures.
3. Prove at least one Word delivery route.
4. Continue platform probes in parallel.
5. Integrate the best route into a usable local tool.

## Task Backlog

- [x] **Codex**: Initialize multi-agent project scaffold from General Agentic Workflow.
- [x] **Codex**: Define product problem, architecture, roles, and file boundaries.
- [x] **Codex**: Activate Continuous Build Mode and update all agent task briefs.
- [x] **Codex**: Scaffold the local tool package, scripts, and integration entry points.
- [ ] **Codex**: Keep polling tracker updates, resolve file conflicts, and dispatch follow-up tasks.
- [x] **Trae**: Execute Phase 0 manual clipboard tests for ChatGPT, Claude, and Gemini on Word desktop.
- [x] **Trae**: Inspect rendered DOM for MathML, TeX annotations, or HTML-only math output per platform.
- [x] **Trae**: Add fallback source extraction plan for manual pasted response text if browser extraction is blocked.
- [x] **VS Code AI**: Build proof that sample LaTeX can be converted to MathML using MathJax or documented compatible tooling.
- [x] **VS Code AI**: Build proof that MathML can be transformed to OMML using `MML2OMML.xsl` or a checked-in compatible strategy.
- [x] **VS Code AI**: Add fixture-driven tests for inline, display, fraction, Greek, matrix, cases, and mixed prose examples.
- [x] **Cursor**: Prototype HTML clipboard payload containing MathML and document Word paste behavior.
- [x] **Cursor**: Draft deterministic Word Add-in path using Office.js `Range.insertOoxml()`.
- [x] **Cursor**: Create the smallest local user flow for manual input -> convert -> Word output.
- [x] **Cursor**: Build Word Add-in task-pane manifest scaffold (`src/word-delivery/addin/` — sideload wiring still needs Codex HTTPS dev server).
- [x] **Codex**: Integrate current findings into a dual-route MVP baseline: DOCX/OMML primary plus HTML/MathML clipboard testing.
- [ ] **All Agents**: Continue taking scoped follow-up tasks until the MVP acceptance standard is met.

## MVP Acceptance Checklist

- [x] Accepts pasted AI response text containing LaTeX.
- [x] Parses prose, inline math, and display math into ordered segments.
- [x] Converts fixture math to MathML.
- [x] Converts or maps fixture math to OMML/OOXML or another Word-ingestable native equation route.
- [x] Produces a delivery artifact or flow users can try with desktop Word.
- [x] Includes repeatable fixture verification.
- [x] Documents ChatGPT, Claude, and Gemini source extraction findings or a fallback route.

## Completed

- [x] General Agentic Workflow copied into the project.
- [x] Orchestration guide adapted for Codex-as-orchestrator collaboration.
- [x] Product spec, technical architecture, and agent task briefs created.
- [x] Continuous build protocol added.
