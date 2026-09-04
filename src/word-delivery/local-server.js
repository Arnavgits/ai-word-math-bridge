/**
 * Minimal local server for the manual-input UI.
 * Uses root convertAiResponse pipeline via delivery-bridge.
 *
 * Run from project root: node src/word-delivery/local-server.js
 * Open: http://localhost:4173
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertForWordDelivery } from "./delivery-bridge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_ROOT = path.join(__dirname, "..", "ui");
const DELIVERY_ROOT = __dirname;
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function serveStatic(urlPath, res) {
  let root = UI_ROOT;
  let relPath = urlPath;

  if (urlPath.startsWith("/word-delivery/")) {
    root = DELIVERY_ROOT;
    relPath = urlPath.slice("/word-delivery".length);
  } else if (urlPath.startsWith("/addin/")) {
    root = path.join(DELIVERY_ROOT, "addin");
    relPath = urlPath.slice("/addin".length);
  }

  const requestedPath = relPath === "/" || relPath === "" ? "index.html" : relPath.replace(/^[/\\]+/, "");
  const safePath = path.normalize(requestedPath);
  const rootPath = path.resolve(root);
  const filePath = path.resolve(rootPath, safePath);
  if (safePath.startsWith("..") || path.isAbsolute(safePath) || !filePath.startsWith(rootPath)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "POST" && url.pathname === "/api/convert") {
    try {
      const body = await readBody(req);
      const payload = JSON.parse(body);
      const result = convertForWordDelivery(payload.text ?? "");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          segments: result.segments,
          html: result.html,
          ooxml: result.ooxml,
          plainText: result.plainText,
          errors: result.errors,
          stats: result.stats,
          docxBase64: result.docx.toString("base64"),
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: message }));
    }
    return;
  }

  if (req.method === "GET") {
    serveStatic(url.pathname, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`AI Word Math Bridge UI: http://localhost:${PORT}`);
  console.log("Uses root pipeline: convertAiResponse -> MathML HTML + OMML DOCX");
});
