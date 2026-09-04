# Smallest UX Flow: AI Response → Word

## Goal

One intentional user action after capture converts math-heavy AI output into native Word equations.

## Recommended MVP Flow (clipboard-first)

```text
1. User selects AI response (or clicks extension "Capture")
2. Tool extracts raw LaTeX / MathML from platform DOM or network payload
3. Tool converts: LaTeX → MathML → (optional) validates MathML
4. Tool writes clipboard:
     text/html  = prose + bare <math> MathML
     text/plain = LaTeX fallback ($...$ / $$...$$)
5. User switches to Word and presses Ctrl+V
6. Word converts MathML → native OfficeMath (editable)
```

### User-visible steps (3 actions)

| Step | User action | System work |
|------|-------------|-------------|
| 1 | Select response or click "Copy for Word" on the AI page | Source extractor runs |
| 2 | (automatic) | LaTeX → MathML, clipboard payload built |
| 3 | Ctrl+V in Word | Word ingests MathML from HTML clipboard |

### Failure UX

- If clipboard API blocked: show "Copy HTML" button with manual select+copy fallback.
- If platform yields no LaTeX/MathML: show "Could not recover equation source" with raw text copy.
- Word Online: instruct user to open equation editor (Alt+=) before paste, or use desktop Word.

## Alternate MVP Flow (Word Add-in-first)

```text
1. User opens Word Add-in task pane
2. User pastes AI response into add-in text area OR clicks "Import from browser" (future)
3. Add-in parses segments, converts LaTeX → MathML → OMML
4. User clicks "Insert at cursor"
5. Add-in calls Range.insertOoxml() with OMML-wrapped OOXML
```

### User-visible steps (4 actions)

| Step | User action | System work |
|------|-------------|-------------|
| 1 | Open Word, launch add-in | Office.onReady |
| 2 | Paste AI text into add-in | Segment parser + conversion |
| 3 | Click "Insert" | insertOoxml at selection |
| 4 | Verify equation is editable | — |

## Dual-route (recommended long-term)

| Context | Route | Why |
|---------|-------|-----|
| Browser on AI platform | Clipboard | Zero install, works outside Word |
| User already in Word | Add-in insertOoxml | Deterministic, no paste-format variance |
| Word Online | Add-in with Desktop fallback warning | Clipboard math paste is weak in Online |

## UI surfaces (minimal)

### Browser extension / bookmarklet

- Floating "Copy for Word" button when math is detected on page.
- Status toast: "Copied — paste into Word with Ctrl+V".

### Word Add-in task pane

- Text area for pasted AI content (interim until browser bridge exists).
- "Insert at cursor" primary button.
- Status line: "3 equations converted, 0 failures".

## Out of scope for MVP UX

- OCR fallback UI.
- Batch document generation.
- Google Docs / Notion targets (future adapters).
