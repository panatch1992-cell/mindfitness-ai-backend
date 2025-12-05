/**
 * Configuration Utility
 *
 * Centralized configuration for API settings, CORS, and environment variables.
 */

// Allowed origins for CORS
export const ALLOWED_ORIGINS = [
  'https://mindfitness.co',
  'https://www.mindfitness.co',
  'https://mindfitness.com',
  'https://www.mindfitness.com',
  'https://mindfitness-ai-backend-4lfy.vercel.app',
  // Add localhost for development
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
].filter(Boolean);

/**
 * Validates and returns the Anthropic (Claude) API key
 * @returns {{ valid: boolean, key?: string, error?: string }}
 */
export function getAnthropicKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { valid: false, error: 'ANTHROPIC_API_KEY is not configured' };
  }
  if (!key.startsWith('sk-ant-')) {
    return { valid: false, error: 'Invalid ANTHROPIC_API_KEY format' };
  }
  return { valid: true, key };
}

/**
 * Gets the Claude model to use
 * @returns {string}
 */
export function getClaudeModel() {
  return process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
}

/**
 * Validates origin against allowed list
 * @param {string} origin - The origin to validate
 * @returns {boolean}
 */
export function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Gets CORS origin for response
 * @param {string} requestOrigin - The request origin
 * @returns {string} - The origin to set in response, or empty string
 */
export function getCORSOrigin(requestOrigin) {
  if (isAllowedOrigin(requestOrigin)) {
    return requestOrigin;
  }
  // In development, allow all origins
  if (process.env.NODE_ENV === 'development') {
    return requestOrigin || '*';
  }
  return '';
}

/**
 * Sets CORS headers on response
 * @param {object} res - Response object
 * @param {string} origin - Request origin
 */
export function setCORSHeaders(res, origin) {
  const allowedOrigin = getCORSOrigin(origin);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
}

/**
 * LINE Bot configuration
 */
export function getLINEConfig() {
  return {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
  };
}

/**
 * Validates LINE configuration
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateLINEConfig() {
  const config = getLINEConfig();
  if (!config.channelAccessToken) {
    return { valid: false, error: 'LINE_CHANNEL_ACCESS_TOKEN is not configured' };
  }
  if (!config.channelSecret) {
    return { valid: false, error: 'LINE_CHANNEL_SECRET is not configured' };
  }
  return { valid: true };
}
