/**
 * Language Configuration Utility
 *
 * Handles multi-language support for Thai, English, and Chinese.
 */

export const SUPPORTED_LANGUAGES = ['th', 'en', 'cn'];
export const DEFAULT_LANGUAGE = 'th';

/**
 * Language-specific instructions for the AI
 */
export const languageInstructions = {
  th: "LANGUAGE: Thai. Tone: Warm, natural (ใช้ 'เรา/MindBot' แทน 'ผม').",
  en: "LANGUAGE: English only. Tone: Professional yet empathetic.",
  cn: "LANGUAGE: Chinese (Simplified). Tone: Warm, respectful, professional.",
};

/**
 * Gets the language instruction for AI prompts
 * @param {string} lang - Language code (th, en, cn)
 * @returns {string} - Language instruction string
 */
export function getLanguageInstruction(lang) {
  const normalizedLang = (lang || DEFAULT_LANGUAGE).toLowerCase();
  return languageInstructions[normalizedLang] || languageInstructions[DEFAULT_LANGUAGE];
}

/**
 * Validates if a language code is supported
 * @param {string} lang - Language code to validate
 * @returns {boolean} - True if language is supported
 */
export function isValidLanguage(lang) {
  return SUPPORTED_LANGUAGES.includes((lang || '').toLowerCase());
}

/**
 * Normalizes language code to supported format
 * @param {string} lang - Language code to normalize
 * @returns {string} - Normalized language code
 */
export function normalizeLanguage(lang) {
  const normalized = (lang || '').toLowerCase();
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : DEFAULT_LANGUAGE;
}
