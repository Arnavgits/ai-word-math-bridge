# AI Word Math Bridge

AI Word Math Bridge converts math-containing AI responses into Word-facing output.

Current MVP:

```text
pasted AI response text
  -> parse prose, inline math, and display math
  -> generate MathML-rich HTML
  -> generate a DOCX containing OMML equations
```

This gives the project a working manual-input route while the agents continue validating direct platform extraction from ChatGPT, Claude, and Gemini.

## Quick Start

From this folder:

```text
npm.cmd test
npm.cmd run fixture
```

Generated files:

```text
dist/sample.html
dist/sample.document.xml
dist/sample.docx
```

Open `dist/sample.docx` in Microsoft Word to inspect native equation behavior. Open `dist/sample.html` in a browser to test the clipboard route.

## Public Deploy: Vercel

This project includes a Vercel serverless endpoint at `api/convert.js` and static UI rewrites in `vercel.json`.

Deploy settings:

```text
Framework preset: Other
Install command: npm install
Build command: leave empty
Output directory: leave empty
```

The root `postinstall` script installs the nested MathJax conversion dependency. Vercel serves the UI at `/` and the converter at `/api/convert`.

## Convert Your Own AI Response

Save a response to a Markdown/text file, then run:

```text
npm.cmd run convert -- --input path\to\response.md --out dist\my-response
```

Or pipe text through stdin:

```text
Get-Content .\samples\sample-ai-response.md | node .\src\cli.mjs --stdin --out dist\from-stdin
```

## Supported MVP Math

The dependency-free baseline supports:

- Inline delimiters: `\(...\)` and `$...$`.
- Display delimiters: `\[...\]` and `$$...$$`.
- Fractions with `\frac{...}{...}`.
- Subscripts and superscripts.
- Greek commands such as `\alpha`, `\beta`, `\mu`, `\Sigma`.
- Basic matrix environments such as `matrix`, `bmatrix`, `pmatrix`, `cases`, and `array`.

## Agent Workflow

This project uses the General Agentic Workflow.

- Codex is the orchestrator.
- Trae owns platform probes/source extraction.
- VS Code AI owns conversion hardening.
- Cursor owns Word delivery UX/prototypes.

All agents should read `ORCHESTRATION_GUIDE.md`, `CONTINUOUS_BUILD_PROTOCOL.md`, `TASK_TRACKER.md`, and their own `AGENT_TASK_*.md` file before working.
