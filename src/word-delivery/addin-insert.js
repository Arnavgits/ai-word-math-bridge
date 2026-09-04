/**
 * Word Add-in delivery route: insert OOXML containing OMML via Office.js.
 *
 * Requires:
 *   - Office.js (WordApi 1.1+ for Range.insertOoxml)
 *   - OMML from upstream conversion (MathML -> OMML)
 *
 * Reference: OfficeDev/office-js samples, Script Lab OOXML snippets.
 */

import {
  buildParagraphFromSegments,
  wrapInOoxmlPackage,
  wrapOMMLInParagraph,
  SAMPLE_OMML,
} from "./ooxml-builder.js";

/**
 * Insert a single OMML equation at the current selection.
 *
 * @param {string} omml - m:oMath or m:oMathPara fragment
 * @param {Word.InsertLocation} [insertLocation=Word.InsertLocation.replace]
 * @returns {Promise<void>}
 */
export async function insertEquationAtSelection(omml, insertLocation = Word.InsertLocation.replace) {
  return Word.run(async (context) => {
    const range = context.document.getSelection();
    const ooxml = wrapOMMLInParagraph(omml, { display: omml.includes("oMathPara") });
    range.insertOoxml(ooxml, insertLocation);
    await context.sync();
  });
}

/**
 * Insert mixed prose + inline equations from parsed document segments.
 *
 * @param {Array<{ type: "text", value: string } | { type: "math", omml: string, display?: boolean }>} segments
 * @param {Word.InsertLocation} [insertLocation=Word.InsertLocation.replace]
 * @returns {Promise<void>}
 */
export async function insertDocumentSegments(segments, insertLocation = Word.InsertLocation.replace) {
  return Word.run(async (context) => {
    const range = context.document.getSelection();

    // Display equations get their own paragraph; inline segments share one paragraph.
    /** @type {string[]} */
    const paragraphs = [];
    /** @type {Array<{ type: "text", value: string } | { type: "math", omml: string }>} */
    let inlineBuffer = [];

    const flushInline = () => {
      if (inlineBuffer.length === 0) return;
      paragraphs.push(buildParagraphFromSegments(inlineBuffer));
      inlineBuffer = [];
    };

    for (const seg of segments) {
      if (seg.type === "math" && seg.display) {
        flushInline();
        paragraphs.push(wrapOMMLInParagraph(seg.omml, { display: true }));
      } else if (seg.type === "math") {
        inlineBuffer.push(seg);
      } else {
        inlineBuffer.push(seg);
      }
    }
    flushInline();

    const ooxml =
      paragraphs.length === 1
        ? paragraphs[0]
        : wrapInOoxmlPackage(paragraphs);

    range.insertOoxml(ooxml, insertLocation);
    await context.sync();
  });
}

/**
 * Task-pane button handler template for the Word Add-in MVP.
 * Wire this to a "Insert converted content" button after Office.onReady.
 */
export function registerAddinHandlers() {
  Office.onReady((info) => {
    if (info.host !== Office.HostType.Word) return;

    const insertBtn = document.getElementById("insert-equation");
    const insertDocBtn = document.getElementById("insert-document");

    insertBtn?.addEventListener("click", async () => {
      try {
        await insertEquationAtSelection(SAMPLE_OMML.fraction);
      } catch (err) {
        console.error("insertOoxml failed:", err);
        showError(err);
      }
    });

    insertDocBtn?.addEventListener("click", async () => {
      try {
        await insertDocumentSegments([
          { type: "text", value: "The ratio is " },
          { type: "math", omml: SAMPLE_OMML.fraction },
          { type: "text", value: " for all positive values." },
        ]);
      } catch (err) {
        console.error("insertOoxml failed:", err);
        showError(err);
      }
    });
  });
}

/** @param {unknown} err */
function showError(err) {
  const message = err instanceof Error ? err.message : String(err);
  const el = document.getElementById("status");
  if (el) el.textContent = `Error: ${message}`;
}

/**
 * Recommended Add-in manifest requirements (document in WORD_DELIVERY_PROTOTYPES.md):
 *
 *   <Requirements>
 *     <Sets DefaultMinVersion="1.1">
 *       <Set Name="WordApi" MinVersion="1.1"/>
 *     </Sets>
 *   </Requirements>
 *
 * Host support notes:
 *   - Word Desktop (Win/Mac): insertOoxml with OMML is reliable for single equations.
 *   - Word Online: known bugs with multiple OMML inserts in one paragraph (OfficeDev/office-js#1448).
 *   - Prefer Desktop for MVP; gate Online behind capability detection.
 */
