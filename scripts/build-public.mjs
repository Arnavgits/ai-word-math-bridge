import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcUi = path.join(root, "src", "ui");
const publicDir = path.join(root, "public");

fs.rmSync(publicDir, { recursive: true, force: true });
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

const appJs = path.join(publicDir, "app.js");
const indexPath = path.join(publicDir, "index.html");

if (fs.existsSync(appJs)) {
  const appText = fs.readFileSync(appJs, "utf8");
  fs.writeFileSync(appJs, appText.replace(/\"\/word-delivery\/clipboard-from-segments\.mjs\"/g, '"/word-delivery/clipboard-from-segments.mjs"'));
}

if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, "utf8");
  const updated = html
    .replace(/href="styles.css"/g, 'href="/styles.css"')
    .replace(/src="app.js"/g, 'src="/app.js"');
  fs.writeFileSync(indexPath, updated);
}

console.log(`Prepared Vercel static output in ${publicDir}`);
