const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { MathMLVisitor } = require('mathjax-full/js/core/MmlTree/MathMLVisitor.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
require('mathjax-full/js/input/tex/ams/AmsConfiguration.js');
require('mathjax-full/js/input/tex/cases/CasesConfiguration.js');

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const mathMlDocument = {
  createElement: (name) => {
    const element = adaptor.create(name);
    element.appendChild = (child) => adaptor.append(element, child);
    element.setAttribute = (key, value) => adaptor.setAttribute(element, key, value);
    Object.defineProperty(element, 'firstChild', { get: () => element.children[0] });
    return element;
  },
  createTextNode: (text) => adaptor.text(text)
};
const mathDocument = mathjax.document('', { InputJax: new TeX({ packages: ['base', 'ams'] }) });
const mathMlVisitor = new MathMLVisitor();

const mathDelimiters = [
  { open: '\\[', close: '\\]', display: true },
  { open: '$$', close: '$$', display: true },
  { open: '\\(', close: '\\)', display: false },
  { open: '$', close: '$', display: false }
];

function normalizeLatex(latex) {
  return latex
    .replace(/\r\n?/g, '\n')
    .replace(/\\dfrac/g, '\\frac')
    .replace(/\\tfrac/g, '\\frac')
    .trim();
}

function parseAiResponse(input) {
  if (typeof input !== 'string') throw new TypeError('AI response must be a string');
  const segments = [];
  let textStart = 0;
  let cursor = 0;

  function appendText(end) {
    if (end > textStart) segments.push({ type: 'text', value: input.slice(textStart, end) });
  }

  while (cursor < input.length) {
    if (input[cursor] === '\\' && input[cursor - 1] !== '\\' && input[cursor + 1] === '$') {
      cursor += 2;
      continue;
    }
    const delimiter = mathDelimiters.find(({ open }) => input.startsWith(open, cursor));
    if (!delimiter || (delimiter.open === '$' && input[cursor - 1] === '\\')) {
      cursor += 1;
      continue;
    }
    const contentStart = cursor + delimiter.open.length;
    let close = input.indexOf(delimiter.close, contentStart);
    while (close !== -1 && input[close - 1] === '\\') close = input.indexOf(delimiter.close, close + delimiter.close.length);
    if (close === -1) {
      cursor += delimiter.open.length;
      continue;
    }
    appendText(cursor);
    segments.push({ type: 'math', latex: input.slice(contentStart, close), display: delimiter.display });
    cursor = close + delimiter.close.length;
    textStart = cursor;
  }
  appendText(input.length);
  return segments;
}

function latexToMathMl(segment) {
  if (!segment || typeof segment.latex !== 'string' || typeof segment.display !== 'boolean') {
    throw new TypeError('A segment with string latex and boolean display is required');
  }
  const node = mathMlVisitor.visitTree(mathDocument.convert(normalizeLatex(segment.latex), { display: segment.display }), mathMlDocument);
  const mathMl = adaptor.outerHTML(node).replace(/^<math(?![^>]*\bxmlns=)([^>]*)>/, '<math$1 xmlns="http://www.w3.org/1998/Math/MathML">');
  const error = mathMl.match(/<merror[^>]*data-mjx-error="([^"]+)"/);
  if (error) throw new Error(`Unsupported LaTeX: ${error[1]}`);
  return mathMl;
}

function parseXml(xml) {
  const tokens = xml.match(/<[^>]+>|[^<]+/g) || [];
  const root = { name: '#root', children: [] };
  const stack = [root];
  for (const token of tokens) {
    if (token.startsWith('<?') || token.startsWith('<!')) continue;
    if (token.startsWith('</')) {
      if (stack.length === 1) throw new Error('Unexpected closing XML tag');
      stack.pop();
    } else if (token.startsWith('<')) {
      const selfClosing = token.endsWith('/>');
      const body = token.slice(1, selfClosing ? -2 : -1).trim();
      const match = body.match(/^([^\s]+)/);
      if (!match) throw new Error('Invalid XML element');
      const node = { name: match[1].split(':').pop(), children: [] };
      stack[stack.length - 1].children.push(node);
      if (!selfClosing) stack.push(node);
    } else {
      const text = token.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
      if (text) stack[stack.length - 1].children.push({ name: '#text', text });
    }
  }
  if (stack.length !== 1) throw new Error('Unclosed XML element');
  return root.children.find((child) => child.name === 'math') || root.children[0];
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function textOf(node) {
  return (node.children || []).map((child) => child.name === '#text' ? child.text : textOf(child)).join('');
}

function run(node) {
  if (node.name === 'mi' || node.name === 'mn' || node.name === 'mo' || node.name === 'mtext') {
    return `<m:r><m:t>${escapeXml(textOf(node))}</m:t></m:r>`;
  }
  if (node.name === 'mrow' || node.name === 'math' || node.name === 'semantics' || node.name === 'mstyle' || node.name === 'TeXAtom' || node.name === 'mtd') {
    return (node.children || []).filter((child) => child.name !== 'annotation').map(run).join('');
  }
  if (node.name === 'mspace') return '';
  if (node.name === 'mfrac') {
    return `<m:f><m:num>${run(node.children[0])}</m:num><m:den>${run(node.children[1])}</m:den></m:f>`;
  }
  if (node.name === 'msub' || node.name === 'msup' || node.name === 'msubsup') {
    const base = run(node.children[0]);
    const sub = node.name === 'msup' ? '' : `<m:sub>${run(node.children[1])}</m:sub>`;
    const sup = node.name === 'msub' ? '' : `<m:sup>${run(node.children[node.name === 'msubsup' ? 2 : 1])}</m:sup>`;
    return `<m:sSubSup><m:e>${base}</m:e>${sub}${sup}</m:sSubSup>`;
  }
  if (node.name === 'mtable') {
    const rows = (node.children || []).filter((child) => child.name === 'mtr').map((row) => {
      const cells = (row.children || []).filter((child) => child.name === 'mtd').map((cell) => `<m:e>${run(cell)}</m:e>`).join('');
      return `<m:tr><m:tc>${cells}</m:tc></m:tr>`;
    }).join('');
    return `<m:m><m:mPr><m:baseJc m:val="centerGroup"/></m:mPr>${rows}</m:m>`;
  }
  throw new Error(`Unsupported MathML element: ${node.name}`);
}

function mathMlToOmml(mathMl) {
  if (typeof mathMl !== 'string' || !mathMl.trim()) throw new TypeError('MathML must be a non-empty string');
  const root = parseXml(mathMl);
  if (!root || root.name !== 'math') throw new Error('Expected a MathML <math> root');
  return `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">${run(root)}</m:oMath>`;
}

module.exports = { parseAiResponse, normalizeLatex, latexToMathMl, mathMlToOmml };