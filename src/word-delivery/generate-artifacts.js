#!/usr/bin/env node
/**
 * CLI wrapper around root delivery pipeline.
 * Prefer root CLI: npm run convert -- --input file.md --out dist/out
 *
 * Usage:
 *   node generate-artifacts.js --input sample-input.txt --out output/
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertForWordDelivery } from "./delivery-bridge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { input: null, out: path.join(__dirname, "output"), text: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--input" && argv[i + 1]) args.input = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) args.out = argv[++i];
    else if (!argv[i].startsWith("--")) args.text = argv[i];
  }
  return args;
}

const args = parseArgs(process.argv);
const raw =
  args.text ??
  (args.input ? fs.readFileSync(args.input, "utf8") : fs.readFileSync(0, "utf8"));

const result = convertForWordDelivery(raw);
fs.mkdirSync(args.out, { recursive: true });

fs.writeFileSync(path.join(args.out, "word-ready.html"), result.html);
fs.writeFileSync(path.join(args.out, "word-ready.document.xml"), result.ooxml);
fs.writeFileSync(path.join(args.out, "word-ready.docx"), result.docx);
fs.writeFileSync(path.join(args.out, "word-ready.plain.txt"), result.plainText);
fs.writeFileSync(
  path.join(args.out, "conversion-report.json"),
  JSON.stringify({ stats: result.stats, errors: result.errors }, null, 2),
);

console.log(`Wrote artifacts to ${args.out}`);
console.log(`  Math segments: ${result.stats.mathCount}`);
console.log(`  Conversion errors: ${result.stats.errorCount}`);
