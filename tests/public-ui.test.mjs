import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import handler from "../api/convert.js";
import * as clipboard from "../src/word-delivery/clipboard-from-segments.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
await import("../scripts/build-public.mjs");
const appSource = fs.readFileSync(path.join(root, "public/app.js"), "utf8");

function createUi({ typesetFailure = false, requestFailure = false } = {}) {
  const elements = new Map();
  const downloads = [];
  const events = [];
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      disabled: false, hidden: false, innerHTML: "", value: "",
      classList: { remove() {}, add() {} },
      addEventListener(name, callback) { this[name] = callback; }
    });
    return elements.get(id);
  };
  const context = vm.createContext({
    ...clipboard,
    document: {
      getElementById: element,
      createElement: () => ({ click() { downloads.push(this); } })
    },
    window: { MathJax: {
      startup: { promise: Promise.resolve() },
      typesetClear() { events.push("clear"); },
      async typesetPromise() {
        events.push("typeset");
        if (typesetFailure) throw new Error("Font unavailable");
      }
    } },
    fetch: async (_url, options) => {
      assert.equal(element("convert").disabled, true);
      if (requestFailure) return { ok: false, status: 502, json: async () => { throw new Error("Bad gateway"); } };
      const response = {
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; return this; }
      };
      await handler({ method: options.method, body: JSON.parse(options.body) }, response);
      return { ok: response.code === 200, json: async () => response.body };
    },
    Blob, Uint8Array, atob,
    URL: { createObjectURL(blob) { events.push(blob); return "blob:test"; }, revokeObjectURL() {} },
    console: { warn() {} }
  });
  // The published module's import paths are checked below. Supply those same
  // module exports here so button handlers can run without a browser process.
  vm.runInContext(appSource.replace(/^import\s*\{[^}]+\}\s*from\s*"[^"]+";\s*/, ""), context);
  return { element, downloads, events };
}

test("production build publishes every local browser entry and module import", () => {
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  assert.match(html, /<script type="module" src="\/app.js"/);
  for (const [, url] of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)) {
    assert.ok(fs.existsSync(path.join(root, "public", url)), `Missing browser asset: ${url}`);
  }
  const imports = [...appSource.matchAll(/from\s*"(\/[^"?#]+)"/g)];
  assert.ok(imports.length > 0);
  for (const [, url] of imports) {
    const modulePath = path.join(root, "public", url);
    assert.ok(fs.existsSync(modulePath), `Missing module: ${url}`);
    assert.doesNotMatch(fs.readFileSync(modulePath, "utf8"), /from\s*["'](?:node:|\.\.)/);
  }
});

test("published Convert button reaches the API, renders math, and downloads DOCX", async () => {
  const ui = createUi();
  await ui.element("convert").click();
  assert.match(ui.element("status").textContent, /Converted 2 equation\(s\)/);
  assert.match(ui.element("preview").innerHTML, /<mfrac>/);
  assert.equal(ui.element("download-docx").disabled, false);
  assert.equal(ui.element("copy-html").disabled, false);
  assert.equal(ui.element("convert").disabled, false);
  assert.deepEqual(ui.events.slice(0, 2), ["clear", "typeset"]);
  ui.element("download-docx").click();
  assert.equal(ui.downloads[0].download, "word-ready.docx");
  const docxBlob = ui.events.find((event) => event instanceof Blob);
  const bytes = Buffer.from(await docxBlob.arrayBuffer());
  assert.equal(bytes.subarray(0, 2).toString(), "PK");
});

test("preview typesetting failure leaves converted exports available", async () => {
  const ui = createUi({ typesetFailure: true });
  await ui.element("convert").click();
  assert.match(ui.element("status").textContent, /Converted 2 equation\(s\)/);
  assert.equal(ui.element("download-docx").disabled, false);
});

test("non-JSON API failure displays HTTP status and allows retry", async () => {
  const ui = createUi({ requestFailure: true });
  await ui.element("convert").click();
  assert.equal(ui.element("status").textContent, "Conversion failed: HTTP 502");
  assert.equal(ui.element("download-docx").disabled, true);
  assert.equal(ui.element("convert").disabled, false);
});
