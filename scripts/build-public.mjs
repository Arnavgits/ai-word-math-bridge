import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcUi = path.join(root, "src", "ui");
const publicDir = path.join(root, "public");

fs.mkdirSync(publicDir, { recursive: true });

for (const entry of fs.readdirSync(srcUi, { withFileTypes: true })) {
  const source = path.join(srcUi, entry.name);
  const target = path.join(publicDir, entry.name);

  if (entry.isDirectory()) {
    fs.cpSync(source, target, { recursive: true });
  } else {
    fs.copyFileSync(source, target);
  }
}

// The browser imports this module at runtime, so it must be deployed alongside
// app.js. Keep the canonical implementation shared with local Word delivery.
const clipboardDir = path.join(publicDir, "word-delivery");
fs.mkdirSync(clipboardDir, { recursive: true });
fs.copyFileSync(
  path.join(root, "src", "word-delivery", "clipboard-from-segments.mjs"),
  path.join(clipboardDir, "clipboard-from-segments.mjs")
);

const indexPath = path.join(publicDir, "index.html");

if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, "utf8");
  const updated = html
    .replace(/href="styles.css"/g, 'href="/styles.css"')
    .replace(/src="app.js"/g, 'src="/app.js"');
  fs.writeFileSync(indexPath, updated);
}

console.log(`Prepared Vercel static output in ${publicDir}`);
