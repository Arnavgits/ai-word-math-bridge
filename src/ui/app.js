import {
  copySegmentsToClipboard,
  copySegmentsToNotionClipboard,
  extractBodyInner
} from "/word-delivery/clipboard-from-segments.mjs";

const inputEl = document.getElementById("input");
const convertBtn = document.getElementById("convert");
const copyBtn = document.getElementById("copy-html");
const copyNotionBtn = document.getElementById("copy-notion");
const downloadHtmlBtn = document.getElementById("download-html");
const downloadOoxmlBtn = document.getElementById("download-ooxml");
const downloadDocxBtn = document.getElementById("download-docx");
const statusEl = document.getElementById("status");
const errorsEl = document.getElementById("errors");
const previewEl = document.getElementById("preview");

/** @type {object | null} */
let lastResult = null;

inputEl.value =
  "The quadratic formula is $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$ and for energy we write $E=mc^2$.";

convertBtn.addEventListener("click", async () => {
  setStatus("Converting...", "");
  copyBtn.disabled = true;
  copyNotionBtn.disabled = true;
  downloadHtmlBtn.disabled = true;
  downloadOoxmlBtn.disabled = true;
  downloadDocxBtn.disabled = true;
  errorsEl.hidden = true;

  try {
    const res = await fetch("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: inputEl.value }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    lastResult = await res.json();
    previewEl.innerHTML = extractBodyInner(lastResult.html);
    renderErrors(lastResult.errors);

    const { mathCount, errorCount } = lastResult.stats;
    if (errorCount > 0) {
      setStatus(
        `Converted ${mathCount} equation(s) with ${errorCount} error(s). Unsupported math left as raw LaTeX.`,
        "error",
      );
    } else {
      setStatus(`Converted ${mathCount} equation(s). Copy for Word or download artifacts.`, "success");
    }

    copyBtn.disabled = mathCount === 0;
    copyNotionBtn.disabled = false;
    downloadHtmlBtn.disabled = false;
    downloadOoxmlBtn.disabled = false;
    downloadDocxBtn.disabled = false;
  } catch (err) {
    lastResult = null;
    previewEl.innerHTML = "";
    setStatus(
      `Conversion failed: ${err.message}. Run: node src/word-delivery/local-server.js`,
      "error",
    );
  }
});

copyBtn.addEventListener("click", async () => {
  if (!lastResult) return;
  const segments = lastResult.segments.filter((s) => s.type === "text" || s.mathMl);
  try {
    await copySegmentsToClipboard(segments, { plainText: lastResult.plainText });
    setStatus("Copied Word-optimized HTML+MathML. Paste into desktop Word with Ctrl+V.", "success");
  } catch (err) {
    setStatus(`Clipboard copy failed: ${err.message}`, "error");
  }
});

copyNotionBtn.addEventListener("click", async () => {
  if (!lastResult) return;
  const segments = lastResult.segments.filter((s) => s.type === "text" || s.latex);
  try {
    await copySegmentsToNotionClipboard(segments);
    setStatus("Copied Notion-ready HTML with Markdown fallback. Paste into Notion with Ctrl+V.", "success");
  } catch (err) {
    setStatus(`Notion clipboard copy failed: ${err.message}`, "error");
  }
});

downloadHtmlBtn.addEventListener("click", () => {
  if (!lastResult) return;
  downloadFile("word-ready.html", lastResult.html, "text/html");
});

downloadOoxmlBtn.addEventListener("click", () => {
  if (!lastResult) return;
  downloadFile("word-ready.document.xml", lastResult.ooxml, "application/xml");
});

downloadDocxBtn.addEventListener("click", () => {
  if (!lastResult?.docxBase64) return;
  const bytes = Uint8Array.from(atob(lastResult.docxBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "word-ready.docx";
  a.click();
  URL.revokeObjectURL(url);
});

function renderErrors(errors) {
  if (!errors?.length) {
    errorsEl.hidden = true;
    return;
  }
  errorsEl.hidden = false;
  errorsEl.innerHTML =
    "<strong>Conversion warnings</strong><ul>" +
    errors.map((e) => `<li><code>${escapeHtml(e.segment.latex)}</code>: ${escapeHtml(e.message)}</li>`).join("") +
    "</ul>";
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = "status" + (kind ? ` ${kind}` : "");
}

function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
