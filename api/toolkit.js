/**
 * Toolkit API Handler
 *
 * Creates personalized psychological toolkit interventions.
 */

import { setCORSHeaders, getAnthropicKey } from '../utils/config.js';
import { callClaude, sanitizeInput, parseJSONResponse } from '../utils/claude.js';
import { normalizeLanguage, getLanguageInstruction, detectLanguage, getAutoTranslationInstruction } from '../utils/language.js';
import { validateToolkitRequest } from '../utils/validation.js';

/**
 * Error messages by language
 */
const ERROR_MESSAGES = {
  th: 'ไม่สามารถสร้าง Toolkit ได้ในขณะนี้',
  en: 'Unable to create toolkit at this time',
  cn: '目前无法创建工具包',
};

/**
 * Gets error message by language
 */
function getErrorMessage(lang) {
  return ERROR_MESSAGES[lang] || ERROR_MESSAGES.th;
}

export default async function handler(req, res) {
  // Get origin from request
  const origin = req.headers.origin || req.headers.referer;

  // Set CORS headers
  setCORSHeaders(res, origin);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate API key
    const keyResult = getAnthropicKey();
    if (!keyResult.valid) {
      console.error('API Key Error:', keyResult.error);
      return res.status(500).json({ success: false, error: 'Service configuration error' });
    }

    // Validate request body
    const validation = validateToolkitRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const { mood, userWork, lang } = validation.data;

    // Sanitize inputs
    const sanitizedMood = sanitizeInput(mood);
    const sanitizedUserWork = sanitizeInput(userWork);

    // Auto-detect language from user input
    const detectedLang = detectLanguage(sanitizedMood + ' ' + sanitizedUserWork);
    const finalLang = detectedLang || normalizeLanguage(lang);
    const langInstruction = getLanguageInstruction(finalLang);
    const autoTranslation = getAutoTranslationInstruction(finalLang);

    const prompt = `
${autoTranslation}
${langInstruction}

Create 3 short, practical, personalized "toolkit" interventions for the user.
Keep each toolkit concrete, easy to do, and tied to a short psychological rationale.

- User mood/label: ${sanitizedMood}
- User description / work-sample: ${sanitizedUserWork}

Output JSON:
{
  "toolkits": [
    { "title": "...", "steps": ["...","..."], "why": "short psychological rationale" },
    ...
  ]
}
Make output strictly JSON (no extra commentary). All text in the JSON must be in the detected language.
`;

    const result = await callClaude({
      systemPrompt: `You are an evidence-based clinical assistant. ${autoTranslation} Create practical, personalized toolkit interventions. Output strictly JSON with no extra commentary.`,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      maxTokens: 800,
    });

    if (!result.success) {
      console.error('Claude Error:', result.error);
      return res.json({
        success: false,
        error: getErrorMessage(finalLang),
      });
    }

    // Try to parse JSON from reply
    const parsed = parseJSONResponse(result.reply, null);

    if (parsed) {
      return res.json({ success: true, data: parsed });
    }

    // Fallback: return raw text
    return res.json({ success: true, raw: result.reply });

  } catch (err) {
    console.error('Toolkit Handler Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
