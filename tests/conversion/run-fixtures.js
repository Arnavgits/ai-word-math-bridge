import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fixtures from './fixtures.js';

const require = createRequire(import.meta.url);
const { latexToMathMl, mathMlToOmml } = require('../../src/conversion');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const outputDirectory = path.join(__dirname, 'artifacts');
fs.mkdirSync(outputDirectory, { recursive: true });
for (const fixture of fixtures) {
  const mathMl = latexToMathMl(fixture);
  fs.writeFileSync(path.join(outputDirectory, `${fixture.name}.mathml`), mathMl);
  fs.writeFileSync(path.join(outputDirectory, `${fixture.name}.omml`), mathMlToOmml(mathMl));
}
console.log(`Wrote ${fixtures.length * 2} inspection artifacts to ${outputDirectory}`);