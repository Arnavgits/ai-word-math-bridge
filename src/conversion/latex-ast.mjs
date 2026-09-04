const namedSymbols = {
  alpha: "\u03b1",
  beta: "\u03b2",
  gamma: "\u03b3",
  delta: "\u03b4",
  epsilon: "\u03b5",
  theta: "\u03b8",
  lambda: "\u03bb",
  mu: "\u03bc",
  pi: "\u03c0",
  sigma: "\u03c3",
  Sigma: "\u03a3",
  omega: "\u03c9",
  Omega: "\u03a9",
  times: "\u00d7",
  cdot: "\u00b7",
  leq: "\u2264",
  geq: "\u2265",
  neq: "\u2260",
  infty: "\u221e",
  pm: "\u00b1"
};

const functionNames = new Set(["sin", "cos", "tan", "log", "ln", "lim", "max", "min"]);

function normalizeLatex(input) {
  return input
    .replaceAll("\\left", "")
    .replaceAll("\\right", "")
    .replaceAll("\\,", " ")
    .replaceAll("\\;", " ")
    .replaceAll("\\!", "")
    .trim();
}

function isLetter(char) {
  return /[A-Za-z]/.test(char);
}

function isDigit(char) {
  return /[0-9]/.test(char);
}

function readCommand(input, pos) {
  let i = pos + 1;
  while (i < input.length && isLetter(input[i])) i += 1;
  if (i === pos + 1) i += 1;
  return { name: input.slice(pos + 1, i), pos: i };
}

function skipSpace(input, pos) {
  let i = pos;
  while (i < input.length && /\s/.test(input[i])) i += 1;
  return i;
}

function splitTopLevel(value, delimiter) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (depth === 0 && value.startsWith(delimiter, i)) {
      parts.push(value.slice(start, i));
      i += delimiter.length - 1;
      start = i + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function findMatchingEnd(input, pos, envName) {
  const needle = `\\end{${envName}}`;
  return input.indexOf(needle, pos);
}

function parseGroup(input, pos) {
  let i = skipSpace(input, pos);
  if (input[i] !== "{") return parseAtom(input, i);
  const parsed = parseExpression(input, i + 1, "}");
  return { node: parsed.node, pos: parsed.pos + 1 };
}

function parseScriptArg(input, pos) {
  return parseGroup(input, pos);
}

function parseMatrix(content) {
  const rows = splitTopLevel(content.trim(), "\\\\")
    .map((row) => splitTopLevel(row, "&").map((cell) => parseLatex(cell.trim())))
    .filter((row) => row.length > 0);
  return { type: "matrix", rows };
}

function parseAtom(input, pos) {
  let i = skipSpace(input, pos);
  const char = input[i];

  if (!char) return { node: { type: "row", children: [] }, pos: i };

  if (char === "{") {
    const parsed = parseExpression(input, i + 1, "}");
    return { node: parsed.node, pos: parsed.pos + 1 };
  }

  if (char === "\\") {
    const command = readCommand(input, i);

    if (command.name === "frac") {
      const numerator = parseGroup(input, command.pos);
      const denominator = parseGroup(input, numerator.pos);
      return { node: { type: "frac", numerator: numerator.node, denominator: denominator.node }, pos: denominator.pos };
    }

    if (command.name === "sqrt") {
      const radicand = parseGroup(input, command.pos);
      return { node: { type: "sqrt", value: radicand.node }, pos: radicand.pos };
    }

    if (command.name === "begin") {
      const group = parseGroup(input, command.pos);
      const envName = flattenText(group.node);
      const end = findMatchingEnd(input, group.pos, envName);
      if (end !== -1) {
        const content = input.slice(group.pos, end);
        const endNeedle = `\\end{${envName}}`;
        if (["matrix", "bmatrix", "pmatrix", "cases", "array"].includes(envName)) {
          return { node: parseMatrix(content), pos: end + endNeedle.length };
        }
      }
    }

    if (namedSymbols[command.name]) {
      return { node: { type: "mi", value: namedSymbols[command.name] }, pos: command.pos };
    }

    if (functionNames.has(command.name)) {
      return { node: { type: "mi", value: command.name }, pos: command.pos };
    }

    return { node: { type: "mi", value: command.name || "\\" }, pos: command.pos };
  }

  if (isDigit(char)) {
    let end = i + 1;
    while (end < input.length && /[0-9.]/.test(input[end])) end += 1;
    return { node: { type: "mn", value: input.slice(i, end) }, pos: end };
  }

  if (isLetter(char)) {
    return { node: { type: "mi", value: char }, pos: i + 1 };
  }

  return { node: { type: "mo", value: char }, pos: i + 1 };
}

function applyScripts(base, input, pos) {
  let i = skipSpace(input, pos);
  let subscript = null;
  let superscript = null;

  for (let count = 0; count < 2; count += 1) {
    if (input[i] === "_") {
      const parsed = parseScriptArg(input, i + 1);
      subscript = parsed.node;
      i = skipSpace(input, parsed.pos);
    } else if (input[i] === "^") {
      const parsed = parseScriptArg(input, i + 1);
      superscript = parsed.node;
      i = skipSpace(input, parsed.pos);
    }
  }

  if (subscript && superscript) return { node: { type: "subsup", base, subscript, superscript }, pos: i };
  if (subscript) return { node: { type: "sub", base, subscript }, pos: i };
  if (superscript) return { node: { type: "sup", base, superscript }, pos: i };
  return { node: base, pos };
}

function parseExpression(input, pos = 0, stop = null) {
  const children = [];
  let i = pos;

  while (i < input.length) {
    if (stop && input[i] === stop) break;
    if (/\s/.test(input[i])) {
      i += 1;
      continue;
    }
    const atom = parseAtom(input, i);
    const scripted = applyScripts(atom.node, input, atom.pos);
    children.push(scripted.node);
    i = scripted.pos;
  }

  return {
    node: children.length === 1 ? children[0] : { type: "row", children },
    pos: i
  };
}

function flattenText(node) {
  if (!node) return "";
  if ("value" in node) return String(node.value);
  if (node.type === "row") return node.children.map(flattenText).join("");
  return "";
}

export function parseLatex(input) {
  return parseExpression(normalizeLatex(input)).node;
}
