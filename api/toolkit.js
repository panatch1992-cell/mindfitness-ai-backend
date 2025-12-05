/**
 * Toolkit API Handler
 *
 * Creates personalized psychological toolkit interventions.
 */

import { setCORSHeaders, getOpenAIKey } from '../utils/config.js';
import { callOpenAI, sanitizeInput, parseJSONResponse } from '../utils/openai.js';
import { normalizeLanguage, getLanguageInstruction } from '../utils/language.js';
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
    const keyResult = getOpenAIKey();
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
    const finalLang = normalizeLanguage(lang);
    const langInstruction = getLanguageInstruction(finalLang);

    // Sanitize inputs
    const sanitizedMood = sanitizeInput(mood);
    const sanitizedUserWork = sanitizeInput(userWork);

    const prompt = `
You are an evidence-based clinical assistant. Create 3 short, practical, personalized "toolkit" interventions
for the user based on the following inputs. Keep each toolkit concrete, easy to do, and tied to a short psychological rationale.

${langInstruction}

- User mood/label: ${sanitizedMood}
- User description / work-sample: ${sanitizedUserWork}

Output JSON:
{
  "toolkits": [
    { "title": "...", "steps": ["...","..."], "why": "short psychological rationale" },
    ...
  ]
}
Make output strictly JSON (no extra commentary).
`;

    const result = await callOpenAI({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      maxTokens: 800,
    });

    if (!result.success) {
      console.error('OpenAI Error:', result.error);
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
