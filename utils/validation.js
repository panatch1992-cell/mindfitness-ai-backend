/**
 * Input Validation Utility
 *
 * Validates and sanitizes user inputs for API handlers.
 */

/**
 * Valid risk levels for vent analysis
 */
export const VALID_RISK_LEVELS = ['none', 'low', 'medium', 'high', 'unknown'];

/**
 * Validates the messages array structure
 * @param {Array} messages - Array of message objects
 * @returns {object} - { valid: boolean, error?: string }
 */
export function validateMessages(messages) {
  if (!Array.isArray(messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }

  if (messages.length === 0) {
    return { valid: false, error: 'Messages array cannot be empty' };
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: `Message at index ${i} must be an object` };
    }
    if (!msg.role || typeof msg.role !== 'string') {
      return { valid: false, error: `Message at index ${i} must have a valid role` };
    }
    if (msg.content === undefined || msg.content === null) {
      return { valid: false, error: `Message at index ${i} must have content` };
    }
  }

  return { valid: true };
}

/**
 * Validates vent text input
 * @param {string} text - The vent text to validate
 * @returns {object} - { valid: boolean, error?: string }
 */
export function validateVentText(text) {
  if (text === undefined || text === null) {
    return { valid: false, error: 'Text is required' };
  }

  if (typeof text !== 'string') {
    return { valid: false, error: 'Text must be a string' };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Text cannot be empty' };
  }

  return { valid: true, text: trimmed };
}

/**
 * Validates toolkit request body
 * @param {object} body - Request body
 * @returns {object} - { valid: boolean, error?: string, data?: object }
 */
export function validateToolkitRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const mood = body.mood || '';
  const userWork = body.userWork || '';
  const lang = body.lang || 'th';

  return {
    valid: true,
    data: { mood, userWork, lang },
  };
}

/**
 * Validates risk level from AI response
 * @param {string} risk - Risk level string
 * @returns {string} - Validated risk level or 'unknown'
 */
export function validateRiskLevel(risk) {
  if (!risk || typeof risk !== 'string') {
    return 'unknown';
  }
  const normalized = risk.toLowerCase();
  return VALID_RISK_LEVELS.includes(normalized) ? normalized : 'unknown';
}

/**
 * Safely parses JSON with fallback
 * @param {string} jsonString - String to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} - Parsed object or fallback
 */
export function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return fallback;
  }
}
