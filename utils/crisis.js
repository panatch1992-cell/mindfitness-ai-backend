/**
 * Crisis Detection Utility
 *
 * CRITICAL: This module handles suicide/self-harm detection.
 * Any changes must be thoroughly tested.
 */

// Crisis patterns for multiple languages
// Thai: ฆ่าตัวตาย (kill oneself), อยากตาย (want to die), ไม่อยากอยู่ (don't want to live)
// English: suicide, kill myself, end my life, hurt myself
// Chinese: 自杀 (suicide), 想死 (want to die), 不想活 (don't want to live)
export const crisisPatterns = [
  // Thai
  /ฆ่าตัวตาย/i,
  /อยากตาย/i,
  /ไม่อยากอยู่/i,
  /ไม่อยากมีชีวิต/i,
  /ทำร้ายตัวเอง/i,
  // English
  /suicide/i,
  /kill myself/i,
  /end my life/i,
  /hurt myself/i,
  /want to die/i,
  /self.?harm/i,
  // Chinese
  /自杀/i,
  /想死/i,
  /不想活/i,
  /自残/i,
];

// Emergency resources by region
export const crisisResources = [
  { name: "Thailand Hotline", info: "1323" },
  { name: "Samaritans Thailand", info: "02-713-6793" },
];

// Language-specific crisis messages
export const crisisMessages = {
  th: `เราเป็นห่วงคุณมากเลย 💙

กรุณาโทรหาสายด่วนสุขภาพจิต 1323 (24 ชม.)
หรือ Samaritans 02-713-6793

คุณไม่ได้อยู่คนเดียวนะ`,
  en: `We're worried about you 💙

Please call Mental Health Hotline 1323 (24 hrs)
or Samaritans 02-713-6793

You're not alone`,
  cn: `我们非常担心您 💙

请拨打心理健康热线 1323（24小时）
或 Samaritans 02-713-6793

您不是一个人`,
};

/**
 * Detects if a message contains crisis indicators
 * @param {string} message - The user's message to check
 * @returns {boolean} - True if crisis patterns are detected
 */
export function detectCrisis(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  return crisisPatterns.some(pattern => pattern.test(message));
}

/**
 * Creates a crisis response object
 * @returns {object} - Crisis response with resources
 */
export function createCrisisResponse() {
  return {
    crisis: true,
    message: "CRISIS_DETECTED",
    resources: crisisResources,
  };
}

/**
 * Checks message and returns crisis response if needed
 * @param {string} message - The user's message to check
 * @returns {object|null} - Crisis response object or null if no crisis
 */
export function handleCrisisCheck(message) {
  if (detectCrisis(message)) {
    return createCrisisResponse();
  }
  return null;
}

/**
 * Gets crisis message for a specific language
 * @param {string} lang - Language code (th, en, cn)
 * @returns {string} - Crisis message in the specified language
 */
export function getCrisisMessage(lang) {
  return crisisMessages[lang] || crisisMessages.th;
}

/**
 * Creates a localized crisis response for LINE bot
 * @param {string} lang - Language code
 * @returns {object} - Crisis response with localized message
 */
export function createLocalizedCrisisResponse(lang) {
  return {
    crisis: true,
    message: getCrisisMessage(lang),
    resources: crisisResources,
  };
}
