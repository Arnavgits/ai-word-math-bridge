import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fixtures from './fixtures.js';

const require = createRequire(import.meta.url);
const { parseAiResponse, normalizeLatex, latexToMathMl, mathMlToOmml } = require('../../src/conversion');

for (const fixture of fixtures) {
  const mathMl = latexToMathMl(fixture);
  assert.match(mathMl, /^<math[^>]*xmlns=/, `${fixture.name} should produce MathML`);
  const omml = mathMlToOmml(mathMl);
  assert.match(omml, /^<m:oMath xmlns:m=/, `${fixture.name} should produce OMML`);
  assert.match(omml, /<m:r><m:t>/, `${fixture.name} should contain an OMML run`);
}

assert.throws(() => mathMlToOmml('<math><mfrac></math>'), /Unclosed XML element/);
assert.throws(() => latexToMathMl({ latex: '\\unknowncommand{x}', display: false }), /Unsupported LaTeX/);
assert.equal(normalizeLatex('  \\dfrac{x}{y}\r\n'), '\\frac{x}{y}');
assert.match(latexToMathMl({ latex: '\\tfrac{x}{y}', display: false }), /<mfrac>/);

const parsed = parseAiResponse('Before \\(x^2\\) between $y$ and $$z$$.\\n\\[w\\] after.');
assert.deepEqual(parsed, [
  { type: 'text', value: 'Before ' },
  { type: 'math', latex: 'x^2', display: false },
  { type: 'text', value: ' between ' },
  { type: 'math', latex: 'y', display: false },
  { type: 'text', value: ' and ' },
  { type: 'math', latex: 'z', display: true },
  { type: 'text', value: '.\\n' },
  { type: 'math', latex: 'w', display: true },
  { type: 'text', value: ' after.' }
]);
assert.deepEqual(parseAiResponse('Price is $5 and this is unmatched'), [
  { type: 'text', value: 'Price is $5 and this is unmatched' }
]);
console.log(`Passed ${fixtures.length} LaTeX -> MathML -> OMML fixture tests.`);