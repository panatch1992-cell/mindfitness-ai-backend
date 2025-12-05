/**
 * Claude (Anthropic) API Utility
 *
 * Handles Claude API calls with proper error handling.
 */

import { getAnthropicKey, getClaudeModel } from './config.js';

/**
 * Anthropic API error codes and their meanings
 */
const ERROR_CODES = {
  400: 'Invalid request format',
  401: 'Invalid API key',
  403: 'Permission denied',
  429: 'Rate limit exceeded. Please try again later.',
  500: 'Anthropic server error. Please try again.',
  503: 'Anthropic service unavailable. Please try again.',
};

/**
 * Makes a request to Claude Messages API
 * @param {object} options - Request options
 * @param {string} options.systemPrompt - System prompt
 * @param {Array} options.messages - Messages array (user/assistant format)
 * @param {number} [options.temperature=0.7] - Temperature setting
 * @param {number} [options.maxTokens=600] - Max tokens
 * @param {string} [options.model] - Model to use (defaults to env or claude-sonnet-4-20250514)
 * @returns {Promise<{ success: boolean, data?: object, error?: string, reply?: string }>}
 */
export async function callClaude({ systemPrompt, messages, temperature = 0.7, maxTokens = 600, model }) {
  // Validate API key
  const keyResult = getAnthropicKey();
  if (!keyResult.valid) {
    return { success: false, error: keyResult.error };
  }

  // Convert messages format if needed (from OpenAI format to Claude format)
  const claudeMessages = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));

  const payload = {
    model: model || getClaudeModel(),
    max_tokens: maxTokens,
    messages: claudeMessages,
  };

  // Add system prompt if provided
  if (systemPrompt) {
    payload.system = systemPrompt;
  }

  // Add temperature only if not default
  if (temperature !== 1.0) {
    payload.temperature = temperature;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': keyResult.key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorMessage = ERROR_CODES[response.status] || `Claude API error: ${response.status}`;

      // Try to get more details from response body
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          return { success: false, error: `${errorMessage} - ${errorData.error.message}` };
        }
      } catch {
        // Ignore JSON parse errors
      }

      return { success: false, error: errorMessage };
    }

    const data = await response.json();

    // Validate response structure (Claude uses content array)
    if (!data.content || !data.content[0]?.text) {
      return { success: false, error: 'Invalid response from Claude' };
    }

    const reply = data.content[0].text;
    return { success: true, data, reply };

  } catch (error) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
    return { success: false, error: `Unexpected error: ${error.message}` };
  }
}

/**
 * Sanitizes user input to prevent prompt injection
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove potential instruction markers
  let sanitized = input
    // Remove common instruction patterns
    .replace(/\[SYSTEM\]/gi, '[USER_INPUT]')
    .replace(/\[INSTRUCTION\]/gi, '[USER_INPUT]')
    .replace(/\[ROLE:/gi, '[USER_INPUT:')
    .replace(/<system>/gi, '[USER_INPUT]')
    .replace(/<\/system>/gi, '[USER_INPUT]')
    // Remove markdown code blocks that might contain instructions
    .replace(/```[\s\S]*?```/g, '[CODE_BLOCK_REMOVED]')
    // Limit length to prevent token overflow
    .substring(0, 2000);

  return sanitized.trim();
}

/**
 * Safely parses JSON from Claude response
 * @param {string} content - Content to parse
 * @param {any} fallback - Fallback value
 * @returns {any} - Parsed JSON or fallback
 */
export function parseJSONResponse(content, fallback = null) {
  if (!content || typeof content !== 'string') {
    return fallback;
  }

  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try to parse directly
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}
