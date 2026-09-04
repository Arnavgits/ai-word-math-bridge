import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { convertAiResponse, segmentsToHtml } from "./index.mjs";
import { createDocx, segmentsToDocumentXml } from "./word-delivery/docx.mjs";

function parseArgs(argv) {
  const args = { input: null, out: "dist/output", stdin: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--input") args.input = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i] === "--stdin") args.stdin = true;
    else if (argv[i] === "--help" || argv[i] === "-h") args.help = true;
  }
  return args;
}

function usage() {
  return `AI Word Math Bridge

Usage:
  npm run convert -- --input samples/sample-ai-response.md --out dist/sample
  Get-Content .\\samples\\sample-ai-response.md | node .\\src\\cli.mjs --stdin --out dist/from-stdin

Outputs:
  <out>.html          MathML-rich HTML with a Copy Rich HTML button
  <out>.docx          Word document containing OMML equations
  <out>.document.xml  Raw WordprocessingML/OMML for inspection
`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const args = parseArgs(process.argv);
if (args.help || (!args.input && !args.stdin)) {
  console.log(usage());
  process.exit(args.help ? 0 : 1);
}

const input = args.stdin ? await readStdin() : await readFile(args.input, "utf8");
const segments = convertAiResponse(input);
const outputBase = path.resolve(args.out);
await mkdir(path.dirname(outputBase), { recursive: true });

await writeFile(`${outputBase}.html`, segmentsToHtml(segments), "utf8");
await writeFile(`${outputBase}.document.xml`, segmentsToDocumentXml(segments), "utf8");
await writeFile(`${outputBase}.docx`, createDocx(segments));

const mathCount = segments.filter((segment) => segment.type === "math").length;
console.log(`Converted ${mathCount} math segment(s).`);
console.log(`Wrote ${outputBase}.html`);
console.log(`Wrote ${outputBase}.document.xml`);
console.log(`Wrote ${outputBase}.docx`);
