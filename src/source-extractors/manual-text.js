export const DISPLAY_ENVS = new Set([
  'equation', 'equation*',
  'align', 'align*', 'aligned',
  'gather', 'gather*', 'gathered',
  'multline', 'multline*',
  'split',
  'alignat', 'alignat*',
  'flalign', 'flalign*',
  'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix',
  'array',
  'eqnarray', 'eqnarray*'
]);
export const INLINE_CAPABLE_ENVS = new Set(['cases', 'smallmatrix']);

const ESCAPED_DOLLAR = '\u0000ESCAPED_DOLLAR\u0000';

function parseAmsEnvironments(text, warnings, cursorStart = 0) {
  const segments = [];
  let remaining = text;
  let cursor = cursorStart;
  const re = /\\begin\{([a-zA-Z*]+)\}/g;
  let match;
  while ((match = re.exec(remaining)) !== null) {
    const env = match[1];
    const envName = env.endsWith('*') ? env.slice(0, -1) : env;
    const endTag = `\\end{${env}}`;
    const startIdx = match.index;
    const afterBegin = startIdx + match[0].length;
    const endIdx = remaining.indexOf(endTag, afterBegin);
    if (endIdx === -1) {
      warnings.push({ code: 'AMS_ENV_UNBALANCED', at: cursor + startIdx, env });
      re.lastIndex = afterBegin;
      continue;
    }
    const afterEnd = endIdx + endTag.length;
    if (startIdx > 0) {
      segments.push({ type: 'text', value: remaining.slice(0, startIdx) });
    }
    const body = remaining.slice(startIdx, afterEnd);
    const display = INLINE_CAPABLE_ENVS.has(envName) ? false : DISPLAY_ENVS.has(envName);
    segments.push({ type: 'math', latex: body, display, source: `ams:${env}` });
    remaining = remaining.slice(afterEnd);
    cursor += afterEnd;
    re.lastIndex = 0;
  }
  if (remaining.length) segments.push({ type: 'text', value: remaining });
  return segments;
}

function flatten(segments) {
  const out = [];
  for (const seg of segments) {
    if (seg.type === 'text') {
      if (out.length && out[out.length - 1].type === 'text') {
        out[out.length - 1].value += seg.value;
      } else if (seg.value.length) {
        out.push(seg);
      }
    } else {
      out.push(seg);
    }
  }
  return out;
}

export function extractFromText(input) {
  if (typeof input !== 'string') {
    throw new TypeError('extractFromText expects a string input');
  }
  const warnings = [];
  let working = input.replace(/\\\$/g, ESCAPED_DOLLAR);
  const mixed = [];
  let i = 0;
  while (i < working.length) {
    if (working.slice(i, i + 2) === '\\[') {
      const end = working.indexOf('\\]', i + 2);
      if (end === -1) {
        warnings.push({ code: 'UNCLOSED_DISPLAY_BRACKET', at: i });
        mixed.push({ type: 'text', value: working.slice(i) });
        break;
      }
      mixed.push({
        type: 'math',
        latex: working.slice(i + 2, end),
        display: true,
        source: 'bracket:display'
      });
      i = end + 2;
      continue;
    }
    if (working.slice(i, i + 2) === '\\(') {
      const end = working.indexOf('\\)', i + 2);
      if (end === -1) {
        warnings.push({ code: 'UNCLOSED_INLINE_PAREN', at: i });
        mixed.push({ type: 'text', value: working.slice(i) });
        break;
      }
      mixed.push({
        type: 'math',
        latex: working.slice(i + 2, end),
        display: false,
        source: 'paren:inline'
      });
      i = end + 2;
      continue;
    }
    if (working.slice(i, i + 2) === '$$') {
      const end = working.indexOf('$$', i + 2);
      if (end === -1) {
        warnings.push({ code: 'UNCLOSED_DOLLAR_DISPLAY', at: i });
        mixed.push({ type: 'text', value: working.slice(i) });
        break;
      }
      mixed.push({
        type: 'math',
        latex: working.slice(i + 2, end),
        display: true,
        source: 'dollar:display'
      });
      i = end + 2;
      continue;
    }
    if (working[i] === '$') {
      let end = -1;
      for (let j = i + 1; j < working.length; j += 1) {
        if (working[j] === '$' && (j === 0 || working[j - 1] !== '\\')) {
          end = j;
          break;
        }
      }
      if (end === -1) {
        warnings.push({ code: 'UNCLOSED_DOLLAR_INLINE', at: i });
        mixed.push({ type: 'text', value: working.slice(i) });
        break;
      }
      mixed.push({
        type: 'math',
        latex: working.slice(i + 1, end),
        display: false,
        source: 'dollar:inline'
      });
      i = end + 1;
      continue;
    }
    let next = working.length;
    for (const marker of ['\\[', '\\(', '$$', '$']) {
      const pos = working.indexOf(marker, i);
      if (pos !== -1 && pos < next) next = pos;
    }
    mixed.push({ type: 'text', value: working.slice(i, next) });
    i = next;
  }
  const afterDelim = [];
  for (const seg of mixed) {
    if (seg.type === 'text') {
      const subSegments = parseAmsEnvironments(seg.value, warnings, i);
      afterDelim.push(...subSegments);
    } else {
      afterDelim.push(seg);
    }
  }
  const restored = afterDelim.map(seg => {
    if (seg.type === 'text') {
      return { type: 'text', value: seg.value.split(ESCAPED_DOLLAR).join('$') };
    }
    return {
      ...seg,
      latex: seg.latex.split(ESCAPED_DOLLAR).join('$').trim()
    };
  });
  return { segments: flatten(restored), warnings };
}
