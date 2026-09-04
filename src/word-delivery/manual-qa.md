# Manual QA: Word Desktop Delivery

Use this checklist to verify the manual-input MVP on real Microsoft Word builds.

## Prerequisites

1. Node.js installed.
2. Conversion deps installed: `cd src/conversion && npm install`
3. Start the local tool: `cd src/word-delivery && node local-server.js`
4. Open http://localhost:4173 in Chrome or Edge.
5. Desktop Word (365 or 2021) on Windows or Mac.

## Test A: Clipboard route (primary MVP)

| Step | Action | Expected |
|------|--------|----------|
| A1 | Paste sample text with `$E=mc^2$` and click **Convert** | Preview shows rendered math |
| A2 | Click **Copy for Word (HTML+MathML)** | Status confirms clipboard write |
| A3 | Open blank Word doc, press Ctrl+V | Native editable equation appears |
| A4 | Double-click the equation | Word equation editor opens |
| A5 | Repeat with display math `$$\int_0^1 x^2 dx$$` | Display equation on own line, editable |
| A6 | Repeat with matrix fixture from UI sample | Matrix renders as native math (may fail on unsupported LaTeX — check errors panel) |

Record Word version, OS, browser, and pass/fail in `docs/PHASE_0_MANUAL_TEST_CHECKLIST.md` (Trae).

## Test B: HTML file route

| Step | Action | Expected |
|------|--------|----------|
| B1 | Convert sample text | Success |
| B2 | Click **Download HTML** | `word-ready.html` saved |
| B3 | Open HTML in browser, select all, copy, paste into Word | Same as Test A (may vary by browser selection) |

## Test C: OOXML / Add-in route

| Step | Action | Expected |
|------|--------|----------|
| C1 | Convert sample text | Success |
| C2 | Click **Download OOXML** | `word-ready.ooxml` saved |
| C3 | In Word Script Lab or add-in prototype, call `insertOoxml` with file contents | Native editable equation at cursor |
| C4 | Insert document with inline + display math | Inline math in paragraph; display math in own paragraph |

## Test D: Error handling

| Step | Action | Expected |
|------|--------|----------|
| D1 | Paste text with unsupported LaTeX (e.g. exotic macro) | Warning listed; raw `$...$` preserved in output |
| D2 | Paste plain prose with no math | Convert succeeds; copy disabled or no-op for math |
| D3 | Paste empty text | Graceful empty result |

## Test E: CLI artifact generation

```powershell
cd "src/word-delivery"
node generate-artifacts.js "Energy: $E=mc^2$."
```

Expected files in `output/`:

- `word-ready.html`
- `word-ready.ooxml`
- `word-ready.plain.txt`
- `conversion-report.json`

## Failure triage

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Clipboard copy fails | Not on localhost / no user gesture | Use local-server UI, click button |
| Word pastes literal MathML XML | Wrong paste mode or old Word | Use desktop Word 365; avoid Paste Special as plain text |
| Word pastes raw LaTeX | MathML not in HTML clipboard | Confirm **Copy for Word** not plain text copy |
| insertOoxml GeneralException | Malformed OOXML | Validate with Script Lab get/set OOXML sample |
| Matrix/cases fails conversion | Mapper coverage gap | See VS Code AI conversion notes; expand mapper or use MML2OMML.xsl |

## Sign-off criteria

- [ ] At least one inline equation pastes as native editable Word math.
- [ ] At least one display equation pastes as native editable Word math.
- [ ] Error panel surfaces unsupported LaTeX without crashing the tool.
- [ ] OOXML download produces insertable fragment on Word Desktop.
