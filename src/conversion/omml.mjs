import { parseLatex } from "./latex-ast.mjs";
import { escapeXml } from "./segments.mjs";

function run(value) {
  return `<m:r><m:t>${escapeXml(value)}</m:t></m:r>`;
}

function wrapArg(xml) {
  return `<m:e>${xml}</m:e>`;
}

function toOmmlNode(node) {
  switch (node.type) {
    case "row":
      return node.children.map(toOmmlNode).join("");
    case "mi":
    case "mn":
    case "mo":
      return run(node.value);
    case "frac":
      return `<m:f><m:fPr><m:type m:val="bar"/></m:fPr><m:num>${toOmmlNode(node.numerator)}</m:num><m:den>${toOmmlNode(node.denominator)}</m:den></m:f>`;
    case "sqrt":
      return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${toOmmlNode(node.value)}</m:e></m:rad>`;
    case "sub":
      return `<m:sSub>${wrapArg(toOmmlNode(node.base))}<m:sub>${toOmmlNode(node.subscript)}</m:sub></m:sSub>`;
    case "sup":
      return `<m:sSup>${wrapArg(toOmmlNode(node.base))}<m:sup>${toOmmlNode(node.superscript)}</m:sup></m:sSup>`;
    case "subsup":
      return `<m:sSubSup>${wrapArg(toOmmlNode(node.base))}<m:sub>${toOmmlNode(node.subscript)}</m:sub><m:sup>${toOmmlNode(node.superscript)}</m:sup></m:sSubSup>`;
    case "matrix":
      return `<m:m><m:mPr/><m:mr>${node.rows.map((row) => row.map((cell) => `<m:e>${toOmmlNode(cell)}</m:e>`).join("")).join("</m:mr><m:mr>")}</m:mr></m:m>`;
    default:
      return run(node.value ?? "");
  }
}

export function latexToOmml({ latex }) {
  return `<m:oMath>${toOmmlNode(parseLatex(latex))}</m:oMath>`;
}

export function mathMlToOmml(mathMl) {
  throw new Error(
    "MathML-to-OMML XSLT is not bundled yet. The MVP uses deterministic LaTeX AST -> OMML generation while VS Code AI validates MML2OMML.xsl."
  );
}
