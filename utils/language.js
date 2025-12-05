/**
 * Language Configuration Utility
 *
 * Handles multi-language support with auto-detection and translation.
 */

export const SUPPORTED_LANGUAGES = ['th', 'en', 'cn'];
export const DEFAULT_LANGUAGE = 'th';

/**
 * Language-specific instructions for the AI (enhanced for auto-translation)
 */
export const languageInstructions = {
  th: `[LANGUAGE: THAI]
- ตอบเป็นภาษาไทยเท่านั้น
- ใช้สรรพนาม "เรา" หรือ "MindBot" (ไม่ใช้ "ผม/ดิฉัน")
- น้ำเสียงอบอุ่น เป็นกันเอง แต่เป็นมืออาชีพ
- ใช้คำลงท้าย "ค่ะ/นะคะ" หรือ "ครับ/นะครับ" ตามความเหมาะสม`,

  en: `[LANGUAGE: ENGLISH]
- Respond in English only
- Use professional yet empathetic tone
- Be warm and supportive
- Use inclusive pronouns`,

  cn: `[LANGUAGE: CHINESE]
- 只用简体中文回复
- 使用温暖、专业的语气
- 保持尊重和支持的态度`,
};

/**
 * Auto-translation instruction - forces Claude to respond in detected language
 * @param {string} lang - Detected language code
 * @returns {string} - Auto-translation instruction
 */
export function getAutoTranslationInstruction(lang) {
  const langNames = {
    th: 'Thai (ภาษาไทย)',
    en: 'English',
    cn: 'Chinese (简体中文)',
  };

  const langName = langNames[lang] || langNames[DEFAULT_LANGUAGE];

  return `[AUTO-TRANSLATION RULE]
CRITICAL: You MUST respond ONLY in ${langName}.
- Detect the user's language from their message
- Always match your response language to the user's language
- Never mix languages in your response
- All content including greetings, explanations, and suggestions must be in ${langName}`;
}

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

/**
 * Detects language from text content
 * @param {string} text - Text to analyze
 * @returns {string} - Detected language code (th, en, cn)
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') {
    return DEFAULT_LANGUAGE;
  }
  // Chinese characters
  if (/[\u4e00-\u9fff]/.test(text)) return 'cn';
  // Thai characters
  if (/[\u0e00-\u0e7f]/.test(text)) return 'th';
  // Default to English
  return 'en';
}

/**
 * Emotion/Case type detection patterns
 */
const caseTypePatterns = {
  stress: /เครียด|stress|压力|กดดัน/i,
  sadness: /เศร้า|sad|难过|ซึม|หดหู่/i,
  anxiety: /กังวล|วิตก|anxious|anxiety|焦虑|worry/i,
  anger: /โกรธ|angry|anger|生气|หงุดหงิด/i,
  loneliness: /เหงา|lonely|孤独|alone/i,
  burnout: /เหนื่อย|burnout|疲惫|หมดแรง|หมดไฟ/i,
  grief: /สูญเสีย|grief|loss|失去/i,
  shame: /อาย|shame|羞耻|ผิด/i,
  relationship: /แฟน|ความสัมพันธ์|relationship|关系/i,
};

/**
 * Detects case type from message content
 * @param {string} text - Text to analyze
 * @returns {string} - Detected case type
 */
export function detectCaseType(text) {
  if (!text || typeof text !== 'string') {
    return 'general';
  }
  const lower = text.toLowerCase();
  for (const [caseType, pattern] of Object.entries(caseTypePatterns)) {
    if (pattern.test(lower)) {
      return caseType;
    }
  }
  return 'general';
}
