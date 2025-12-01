/**
 * Crisis Detection Utility
 *
 * CRITICAL: This module handles suicide/self-harm detection.
 * Any changes must be thoroughly tested.
 */

// Crisis patterns for multiple languages
// Thai: ฆ่าตัวตาย (kill oneself), อยากตาย (want to die)
// English: suicide, kill myself
// Chinese: 自杀 (suicide), 想死 (want to die)
export const crisisPatterns = [
  /ฆ่าตัวตาย/i,
  /อยากตาย/i,
  /suicide/i,
  /kill myself/i,
  /自杀/i,
  /想死/i,
];

// Emergency resources by region
export const crisisResources = [
  { name: "Thailand Hotline", info: "1323" },
  { name: "Samaritans Thailand", info: "02-713-6793" },
];

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
