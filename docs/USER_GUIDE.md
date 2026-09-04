# User Guide

## Goal

Turn AI answers containing LaTeX math into files that Microsoft Word can ingest.

## Basic Flow

1. Copy an AI response that contains math.
2. Save it as a `.md` or `.txt` file.
3. Run the converter.
4. Open the generated `.docx` in Word.
5. Optionally open the generated `.html`, click `Copy Rich HTML`, and paste into Word to test the clipboard route.
6. Or use the local UI's `Copy for Notion` button to paste semantic HTML/Markdown into Notion.

## Commands

```text
npm.cmd test
npm.cmd run fixture
npm.cmd run convert -- --input samples\sample-ai-response.md --out dist\sample
```

PowerShell stdin example:

```text
Get-Content .\samples\sample-ai-response.md | node .\src\cli.mjs --stdin --out dist\from-stdin
```

## What To Check In Word

- Does the `.docx` open?
- Can equations be clicked/edited as Word equations?
- Do inline equations stay inside prose?
- Do display equations appear on their own centered line?
- Do fractions, scripts, Greek letters, and matrices survive?

## What To Check In Notion

- Do headings paste as heading blocks?
- Do bullet and numbered lists remain lists?
- Do code blocks remain code blocks?
- Do inline and display LaTeX delimiters remain intact for Notion equation handling or manual conversion?

## Current Limitation

The MVP accepts manually pasted/saved AI response text. Automatic extraction from ChatGPT, Claude, and Gemini is still assigned to Trae as a parallel workstream. Notion support is a formatting-focused clipboard route; Word-native OMML remains specific to Microsoft Word.
