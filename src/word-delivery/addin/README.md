# Word Add-in Sideload (local dev)

Prototype add-in files live in `src/word-delivery/addin/`.

## Prerequisites

- Desktop Word (Microsoft 365 or Word 2021+)
- Local server: `node src/word-delivery/local-server.js`
- HTTPS dev cert for Office add-in sideloading (Office requires HTTPS for task pane URLs in production; localhost may work with recent Word builds)

## Files

| File | Purpose |
|------|---------|
| `manifest.xml` | Office Add-in manifest (WordApi 1.1) |
| `taskpane.html` | Task pane UI |
| `taskpane.js` | Calls `/api/convert`, inserts OOXML via `insertOoxml` |

## Sideload steps (Windows)

1. Start local server on port 4173.
2. Serve add-in static files — extend `local-server.js` or use a separate static server on port 3000 pointing at `addin/`.
3. In Word: **Insert → Add-ins → My Add-ins → Upload My Add-in** → select `manifest.xml`.
4. Open task pane, paste AI response, click **Insert at cursor**.

## Known limitations

- Manifest URLs point to `https://localhost:3000` — Codex should wire dev server + cert in integration pass.
- Word Online: multiple OMML inserts may be buggy (see office-js#1448).
- Add-in requires local convert server running alongside Word.

## Codex integration note

Manifest registration, HTTPS dev proxy, and npm script for sideload are owned by Codex (`package.json`).
