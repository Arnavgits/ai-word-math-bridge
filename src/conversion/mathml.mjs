import { parseLatex } from "./latex-ast.mjs";
import { escapeXml } from "./segments.mjs";

function toMathMlNode(node) {
  switch (node.type) {
    case "row":
      return `<mrow>${node.children.map(toMathMlNode).join("")}</mrow>`;
    case "mi":
      return `<mi>${escapeXml(node.value)}</mi>`;
    case "mn":
      return `<mn>${escapeXml(node.value)}</mn>`;
    case "mo":
      return `<mo>${escapeXml(node.value)}</mo>`;
    case "frac":
      return `<mfrac>${toMathMlNode(node.numerator)}${toMathMlNode(node.denominator)}</mfrac>`;
    case "sqrt":
      return `<msqrt>${toMathMlNode(node.value)}</msqrt>`;
    case "sub":
      return `<msub>${toMathMlNode(node.base)}${toMathMlNode(node.subscript)}</msub>`;
    case "sup":
      return `<msup>${toMathMlNode(node.base)}${toMathMlNode(node.superscript)}</msup>`;
    case "subsup":
      return `<msubsup>${toMathMlNode(node.base)}${toMathMlNode(node.subscript)}${toMathMlNode(node.superscript)}</msubsup>`;
    case "matrix":
      return `<mtable>${node.rows.map((row) => `<mtr>${row.map((cell) => `<mtd>${toMathMlNode(cell)}</mtd>`).join("")}</mtr>`).join("")}</mtable>`;
    default:
      return `<mi>${escapeXml(node.value ?? "")}</mi>`;
  }
}

export function latexToMathMl({ latex, display = false }) {
  const ast = parseLatex(latex);
  const displayAttr = display ? ' display="block"' : "";
  return `<math xmlns="http://www.w3.org/1998/Math/MathML"${displayAttr}>${toMathMlNode(ast)}</math>`;
}
