import { extractFromText, DISPLAY_ENVS, INLINE_CAPABLE_ENVS } from './manual-text.js';
import {
  CHATGPT_SELECTORS,
  CLAUDE_SELECTORS,
  GEMINI_SELECTORS,
  CLIPBOARD_PRIORITIES,
  extractChatGPTFromDocument,
  extractClaudeFromDocument,
  extractGeminiFromDocument
} from './selector-cheatsheet.js';

export const EXTRACTOR_VERSION = '0.1.0-trae';

export {
  extractFromText,
  DISPLAY_ENVS,
  INLINE_CAPABLE_ENVS,
  CHATGPT_SELECTORS,
  CLAUDE_SELECTORS,
  GEMINI_SELECTORS,
  CLIPBOARD_PRIORITIES,
  extractChatGPTFromDocument,
  extractClaudeFromDocument,
  extractGeminiFromDocument
};

export function extractFromClipboardFragments(fragments) {
  const { text = '', html = null } = fragments ?? {};
  const fromText = extractFromText(text ?? '');
  const fromHtml = { segments: [], warnings: [] };
  return {
    segments: fromText.segments,
    warnings: fromText.warnings.concat(fromHtml.warnings),
    source: text && /\$|\\begin|\\\[|\\\(/.test(text) ? 'clipboard:text' : 'clipboard:text-no-delimiters',
    htmlAvailable: typeof html === 'string' && html.length > 0
  };
}
