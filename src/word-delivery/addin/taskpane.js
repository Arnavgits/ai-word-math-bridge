/**
 * Word Add-in task pane — calls local convert API, inserts OOXML at selection.
 * Requires: local-server.js running + add-in sideloaded with manifest.xml
 */

const inputEl = document.getElementById("input");
const insertBtn = document.getElementById("insert");
const statusEl = document.getElementById("status");

const API = "http://localhost:4173/api/convert";

Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) {
    statusEl.textContent = "This add-in runs in Word only.";
    return;
  }
  statusEl.textContent = "Ready. Paste AI text and click Insert.";
  insertBtn.onclick = insertAtCursor;
});

async function insertAtCursor() {
  statusEl.textContent = "Converting…";
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: inputEl.value }),
    });
    if (!res.ok) throw new Error(`Convert failed: HTTP ${res.status}`);
    const { ooxml, stats, errors } = await res.json();

    if (stats.errorCount > 0) {
      statusEl.textContent = `Inserted with ${stats.errorCount} conversion warning(s).`;
    }

    await Word.run(async (context) => {
      const range = context.document.getSelection();
      range.insertOoxml(ooxml, Word.InsertLocation.replace);
      await context.sync();
    });

    statusEl.textContent = `Inserted ${stats.mathCount} equation(s) at cursor.`;
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}. Is local-server running on port 4173?`;
  }
}
