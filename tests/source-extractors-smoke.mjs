import { extractFromText } from '../src/source-extractors/manual-text.js';

const cases = [
  'We know that $x^2 + y^2 = z^2$ holds for integers.',
  'The integral is: $$\\int_0^1 x^2 \\, dx = \\frac{1}{3}.$$',
  'Ratio is \\(\\frac{a_{n+1}}{b^2}\\) inline.',
  'Greeks: \\[\\alpha + \\beta = \\gamma\\]',
  'Matrix:\n$$\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}$$',
  'Price is \\$5 plus $f(x) = \\begin{cases} x^2 & x > 0 \\\\ 0 & x \\leq 0 \\end{cases}$ inline cases.',
  'Mixed: We define $E = mc^2$ as mass-energy equivalence. So \\(a^2 + b^2 = c^2\\) too. Display: $$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$ Then prose continues.',
  'Unclosed: Show $\\frac{a}{b} and $$\\int x$$',
  'Aligned env: \\begin{align*} a &= b + c \\\\ d &= e + f \\end{align*}',
  'Naked AMS cases with no dollars: Text here \\begin{cases} 1 & x \\\\ 0 & \\text{otherwise} \\end{cases} then more text.'
];

let passed = 0;
let failed = 0;

function assert(cond, label, detail) {
  if (cond) {
    passed++;
    console.log('  ✓', label);
  } else {
    failed++;
    console.log('  ✗', label, ' — ', detail);
  }
}

for (let idx = 0; idx < cases.length; idx++) {
  console.log(`\n=== CASE ${idx + 1} ===`);
  const r = extractFromText(cases[idx]);
  console.log('INPUT:', JSON.stringify(cases[idx]).slice(0, 120));
  r.segments.forEach((s, i) => {
    const head = s.type === 'text'
      ? `text[:80]=${JSON.stringify(s.value.slice(0, 80))}`
      : `display=${s.display} latex=${JSON.stringify(s.latex)} source=${s.source || '?'}`;
    console.log('  seg', i, s.type, head);
  });
  if (r.warnings.length) console.log('  WARNINGS:', JSON.stringify(r.warnings));

  if (idx === 0) {
    assert(r.segments.length === 3, '3 segments expected', `got ${r.segments.length}`);
    assert(r.segments[1].type === 'math' && !r.segments[1].display, 'seg1 inline math', JSON.stringify(r.segments[1]));
    assert(r.segments[1].latex === 'x^2 + y^2 = z^2', 'latex preserved', r.segments[1].latex);
    assert(r.warnings.length === 0, 'no warnings', JSON.stringify(r.warnings));
  }
  if (idx === 1) {
    assert(r.segments.length === 2, '2 segments', `got ${r.segments.length}`);
    assert(r.segments[1].type === 'math' && r.segments[1].display, 'display math', JSON.stringify(r.segments[1]));
    assert(r.segments[1].latex.includes('\\int') && r.segments[1].latex.includes('\\frac'), 'has int and frac', r.segments[1].latex);
  }
  if (idx === 2) {
    assert(r.segments.length === 3, '3 segments', `got ${r.segments.length}`);
    assert(r.segments[1].type === 'math' && !r.segments[1].display, 'inline paren math');
    assert(r.segments[1].latex.includes('\\frac{a_{n+1}}{b^2}'), 'frac latex', r.segments[1].latex);
  }
  if (idx === 3) {
    assert(r.segments.length === 2, '2 segments', `got ${r.segments.length}`);
    assert(r.segments[1].type === 'math' && r.segments[1].display, 'bracket display math');
    assert(r.segments[1].latex.includes('\\alpha') && r.segments[1].latex.includes('\\beta') && r.segments[1].latex.includes('\\gamma'), 'greeks', r.segments[1].latex);
  }
  if (idx === 4) {
    const mathSegs = r.segments.filter(s => s.type === 'math');
    assert(mathSegs.length === 1, '1 math seg', `got ${mathSegs.length}`);
    assert(mathSegs[0].display, 'display=true');
    assert(mathSegs[0].latex.includes('\\begin{bmatrix}') && mathSegs[0].latex.includes('\\end{bmatrix}'), 'bmatrix env', mathSegs[0].latex);
  }
  if (idx === 5) {
    assert(r.segments[0].value.includes('$5') || r.segments[0].value.includes('5'), 'escaped dollar survived: ' + JSON.stringify(r.segments[0].value));
    const mathSegs = r.segments.filter(s => s.type === 'math');
    assert(mathSegs.length >= 1, 'at least 1 math seg for cases', `got ${mathSegs.length}`);
    const casesSeg = mathSegs.find(s => s.latex.includes('cases'));
    assert(casesSeg && !casesSeg.display, 'cases inline=true', casesSeg && casesSeg.latex);
  }
  if (idx === 6) {
    const mathSegs = r.segments.filter(s => s.type === 'math');
    assert(mathSegs.length === 3, '3 math segs', `got ${mathSegs.length}: ${JSON.stringify(mathSegs)}`);
    assert(!mathSegs[0].display, 'seg0 inline');
    assert(!mathSegs[1].display, 'seg1 inline');
    assert(mathSegs[2].display, 'seg2 display');
    assert(r.warnings.length === 0, 'no warnings', JSON.stringify(r.warnings));
  }
  if (idx === 7) {
    assert(r.warnings.length >= 1, 'unclosed produces warnings', JSON.stringify(r.warnings));
  }
  if (idx === 8) {
    const mathSegs = r.segments.filter(s => s.type === 'math');
    assert(mathSegs.length === 1 && mathSegs[0].source === 'ams:align*', 'align* AMS standalone detected', JSON.stringify(mathSegs[0]));
    assert(mathSegs[0].display, 'align* is display');
  }
  if (idx === 9) {
    const mathSegs = r.segments.filter(s => s.type === 'math');
    assert(mathSegs.length === 1 && mathSegs[0].source === 'ams:cases', 'naked AMS cases in prose detected', JSON.stringify(mathSegs[0]));
    assert(!mathSegs[0].display, 'cases is inline capable');
  }
}

console.log(`\n====== RESULT: ${passed} passed, ${failed} failed ======`);
process.exit(failed === 0 ? 0 : 1);
