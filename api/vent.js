/**
 * Vent Wall API Handler
 *
 * Accepts vent text, runs AI risk-check, returns analysis and empathetic response.
 */

import { setCORSHeaders, getAnthropicKey } from '../utils/config.js';
import { callClaude, sanitizeInput, parseJSONResponse } from '../utils/claude.js';
import { normalizeLanguage, getLanguageInstruction, detectLanguage, getAutoTranslationInstruction } from '../utils/language.js';
import { validateVentText, validateRiskLevel } from '../utils/validation.js';
import { detectCrisis, createCrisisResponse } from '../utils/crisis.js';
import { saveVentPost } from '../utils/database.js';

/**
 * Error messages by language
 */
const ERROR_MESSAGES = {
  th: 'รับฟังอยู่นะคะ',
  en: 'I\'m here listening',
  cn: '我在听',
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

    // Validate and sanitize text input
    const textValidation = validateVentText(req.body?.text);
    if (!textValidation.valid) {
      return res.status(400).json({ success: false, error: textValidation.error });
    }

    const text = sanitizeInput(textValidation.text);

    // Auto-detect language from user vent text
    const detectedLang = detectLanguage(text);
    const specifiedLang = normalizeLanguage(req.body?.lang);
    const finalLang = detectedLang || specifiedLang;
    const langInstruction = getLanguageInstruction(finalLang);
    const autoTranslation = getAutoTranslationInstruction(finalLang);

    // Check for crisis keywords first
    if (detectCrisis(text)) {
      const crisisResponse = createCrisisResponse();
      return res.json({
        success: true,
        crisis: true,
        analysis: { risk: 'high', tags: ['crisis'] },
        reply: crisisResponse.message,
        resources: crisisResponse.resources,
      });
    }

    // Build prompt - user input is now safely encapsulated
    const prompt = `You are an empathetic, safety-first assistant analyzing a user's vent message.
${autoTranslation}
${langInstruction}

[USER_VENT_START]
${text}
[USER_VENT_END]

Based ONLY on the content between USER_VENT_START and USER_VENT_END markers, provide:
1) "analysis": classification with "risk": "none"|"low"|"medium"|"high" and "tags": [emotion keywords in the detected language]
2) "reply": a brief empathetic reply (1-3 sentences) in the same language as the user's message

Return strictly JSON:
{"analysis": {"risk":"low", "tags":["sad","lonely"]}, "reply":"..."}`;

    const result = await callClaude({
      systemPrompt: `You are an empathetic, safety-first assistant analyzing user vent messages. ${autoTranslation} Return strictly JSON.`,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      maxTokens: 400,
    });

    if (!result.success) {
      console.error('Claude Error:', result.error);
      return res.json({
        success: true,
        analysis: { risk: 'unknown', tags: [] },
        reply: getErrorMessage(finalLang),
      });
    }

    // Parse JSON response
    const parsed = parseJSONResponse(result.reply, null);

    if (parsed && parsed.analysis && parsed.reply) {
      // Validate risk level
      const validatedRisk = validateRiskLevel(parsed.analysis.risk);
      const analysisResult = {
        risk: validatedRisk,
        tags: Array.isArray(parsed.analysis.tags) ? parsed.analysis.tags : [],
      };

      // Save vent to database (non-blocking)
      const sessionId = req.body?.sessionId || `anon_${Date.now()}`;
      saveVentPost(text, sessionId, analysisResult).catch(err => {
        console.error('Failed to save vent post:', err);
      });

      return res.json({
        success: true,
        analysis: analysisResult,
        reply: parsed.reply,
      });
    }

    // Fallback if parsing fails
    return res.json({
      success: true,
      analysis: { risk: 'unknown', tags: [] },
      reply: result.reply || getErrorMessage(finalLang),
    });

  } catch (err) {
    console.error('Vent Handler Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
