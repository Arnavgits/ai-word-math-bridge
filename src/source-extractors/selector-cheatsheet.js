export const CHATGPT_SELECTORS = {
  assistantContainer: '[data-message-author-role="assistant"]',
  mathScriptInline: 'script[type="math/tex"]',
  mathScriptDisplay: 'script[type="math/tex; mode=display"]',
  katexMathMl: '.katex-mathml',
  annotation: 'annotation[encoding="application/x-tex"]',
  katexWrapper: '.katex',
  katexHtml: '.katex-html',
  mathWrapperClasses: ['.katex', '.math']
};

export async function extractChatGPTFromDocument(doc) {
  const scripts = [...doc.querySelectorAll(
    [CHATGPT_SELECTORS.mathScriptInline, CHATGPT_SELECTORS.mathScriptDisplay].join(',')
  )];
  const fromScripts = scripts.map(el => ({
    type: 'math',
    latex: el.textContent || '',
    display: el.getAttribute('type') === 'math/tex; mode=display',
    source: 'chatgpt:script'
  }));

  const annotations = [...doc.querySelectorAll(CHATGPT_SELECTORS.annotation)];
  const fromAnnotation = annotations
    .filter((_, i) => i >= fromScripts.length)
    .map(el => {
      const wrapper = el.closest(CHATGPT_SELECTORS.katexWrapper);
      return {
        type: 'math',
        latex: (el.textContent || '').trim(),
        display: wrapper ? getComputedStyle(wrapper).display === 'block' : false,
        source: 'chatgpt:annotation'
      };
    });

  return [...fromScripts, ...fromAnnotation];
}

export const CLAUDE_SELECTORS = {
  proseContainer: '.prose',
  mathjaxContainer: 'mjx-container',
  mathScriptInline: 'script[type="math/tex"]',
  mathScriptDisplay: 'script[type="math/tex; mode=display"]',
  annotation: 'annotation[encoding="application/x-tex"]',
  inlineSpan: 'span.math-inline',
  displayDiv: 'div.math-display'
};

export async function extractClaudeFromDocument(doc) {
  const scripts = [...doc.querySelectorAll(
    [CLAUDE_SELECTORS.mathScriptInline, CLAUDE_SELECTORS.mathScriptDisplay].join(',')
  )];
  const fromScripts = scripts.map(el => ({
    type: 'math',
    latex: (el.textContent || '').trim(),
    display: el.getAttribute('type') === 'math/tex; mode=display',
    source: 'claude:script'
  }));

  const mjx = [...doc.querySelectorAll(CLAUDE_SELECTORS.mathjaxContainer)];
  const fromMjx = mjx
    .filter((_, i) => i >= fromScripts.length)
    .map(container => {
      const mathEl = (container.shadowRoot
        ? container.shadowRoot.querySelector(CLAUDE_SELECTORS.annotation)
        : container.querySelector(CLAUDE_SELECTORS.annotation))
        || (container.shadowRoot
          ? container.shadowRoot.querySelector('math > semantics > annotation')
          : container.querySelector('math > semantics > annotation'));
      return {
        type: 'math',
        latex: mathEl ? mathEl.textContent.trim() : '',
        display: container.getAttribute('display') === 'true',
        source: 'claude:mjx'
      };
    })
    .filter(m => m.latex.length > 0);

  return [...fromScripts, ...fromMjx];
}

export const GEMINI_SELECTORS = {
  generationContainer: '.generation-container, .model-response-text, [data-testid="model-response-text"]',
  katexAnnotation: '.katex-mathml annotation[encoding="application/x-tex"]',
  katexWrapper: '.katex',
  mathImg: 'img[alt*="="], img[alt*="+"], svg'
};

export function extractGeminiFromDocument(doc) {
  const annotations = [...doc.querySelectorAll(GEMINI_SELECTORS.katexAnnotation)];
  if (annotations.length) {
    return annotations.map(el => {
      const wrapper = el.closest(GEMINI_SELECTORS.katexWrapper);
      return {
        type: 'math',
        latex: (el.textContent || '').trim(),
        display: wrapper ? getComputedStyle(wrapper).display === 'block' : false,
        source: 'gemini:annotation-variant2'
      };
    });
  }
  return {
    status: 'UNICODE_ONLY_RECOVERED',
    note: 'Default Gemini Web UI (Variant 1): no LaTeX anchors found. Either enable "Copy raw" Labs toggle or use the Gemini API JSON client.',
    fallbackTextOnly: true
  };
}

export const CLIPBOARD_PRIORITIES = [
  { platform: 'chatgpt-copybutton', scan: t => /^\s*\$\$[\s\S]+\$\$|\$[^$]+\$/.test(t), reliability: 0.9 },
  { platform: 'claude-copybutton',  scan: t => /\$\$[\s\S]+\$\$|\\\[[\s\S]+\\\]/.test(t) && /\\begin\{align|\\frac|\\sum|\\int/.test(t), reliability: 0.95 },
  { platform: 'gemini-copybutton', scan: t => /\$[^$]+\$|\\begin\{/.test(t), reliability: 0.3 },
  { platform: 'manual-text-fallback', scan: t => true, reliability: 0.1 }
];
