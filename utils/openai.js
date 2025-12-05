/**
 * OpenAI API Utility
 *
 * Handles OpenAI API calls with proper error handling.
 */

import { getOpenAIKey, getOpenAIModel } from './config.js';

/**
 * OpenAI API error codes and their meanings
 */
const ERROR_CODES = {
  401: 'Invalid API key',
  429: 'Rate limit exceeded. Please try again later.',
  500: 'OpenAI server error. Please try again.',
  503: 'OpenAI service unavailable. Please try again.',
};

/**
 * Makes a request to OpenAI Chat Completions API
 * @param {object} options - Request options
 * @param {Array} options.messages - Messages array
 * @param {number} [options.temperature=0.7] - Temperature setting
 * @param {number} [options.maxTokens=600] - Max tokens
 * @param {string} [options.model] - Model to use (defaults to env or gpt-4o-mini)
 * @returns {Promise<{ success: boolean, data?: object, error?: string, reply?: string }>}
 */
export async function callOpenAI({ messages, temperature = 0.7, maxTokens = 600, model }) {
  // Validate API key
  const keyResult = getOpenAIKey();
  if (!keyResult.valid) {
    return { success: false, error: keyResult.error };
  }

  const payload = {
    model: model || getOpenAIModel(),
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keyResult.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorMessage = ERROR_CODES[response.status] || `OpenAI API error: ${response.status}`;

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

    // Validate response structure
    if (!data.choices || !data.choices[0]?.message?.content) {
      return { success: false, error: 'Invalid response from OpenAI' };
    }

    const reply = data.choices[0].message.content;
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
    // Remove markdown code blocks that might contain instructions
    .replace(/```[\s\S]*?```/g, '[CODE_BLOCK_REMOVED]')
    // Limit length to prevent token overflow
    .substring(0, 2000);

  return sanitized.trim();
}

/**
 * Safely parses JSON from OpenAI response
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
