/**
 * Chat API Handler
 *
 * Main endpoint for MindBot AI chat functionality.
 */

import { setCORSHeaders, getAnthropicKey } from '../utils/config.js';
import { callClaude, sanitizeInput } from '../utils/claude.js';
import { detectCrisis, createCrisisResponse } from '../utils/crisis.js';
import { getLanguageInstruction, normalizeLanguage } from '../utils/language.js';
import { getCaseInstruction, getModeInstruction, getMaxTokens } from '../utils/modes.js';
import { validateMessages } from '../utils/validation.js';

/**
 * Research knowledge base for social stigmas
 */
const RESEARCH_KNOWLEDGE = `
[KNOWLEDGE: THAI SOCIAL STIGMAS & RESEARCH]
You must be aware of these specific contexts:
1. **Facebook/Pantip ("Ungrateful/Karma"):** Belief that depression is caused by being ungrateful (Akatappanyu) or lack of Dharma.
2. **Twitter/X ("Toxic Productivity"):** Burnout viewed as "weakness" or "lazy Gen Z".
3. **TikTok ("Attention Seeker"):** Accusation that expressing sadness is just "content creation" or "faking it".
4. **Telegram/Closed Groups ("Scam/Isolation"):** Victim blaming in investment scams ("You are stupid for losing money") or toxic closed-community pressure.

[CORE PROTOCOL]
Identify Emotion -> Validate -> Challenge Stigma (Critical Reflection) -> New Understanding.
`;

/**
 * Error messages by language
 */
const ERROR_MESSAGES = {
  th: 'ขออภัยค่ะ ไม่สามารถประมวลผลได้ในขณะนี้',
  en: 'Sorry, we cannot process your request at this time',
  cn: '抱歉，目前无法处理您的请求',
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
    // Validate API key exists
    const keyResult = getAnthropicKey();
    if (!keyResult.valid) {
      console.error('API Key Error:', keyResult.error);
      return res.status(500).json({ error: 'Service configuration error' });
    }

    // Parse request body
    const {
      message,
      messages: rawMessages,
      caseType = 'general',
      isPremium = false,
      isWorkshop = false,
      isToolkit = false,
      isVent = false,
      targetGroup = 'general',
      language = 'th',
      lang = 'th',
    } = req.body;

    // Normalize language
    const finalLang = normalizeLanguage(lang || language);

    // Build messages array
    let messages = rawMessages;
    if (!messages || !Array.isArray(messages)) {
      const userMessage = sanitizeInput(message || '');
      messages = [{ role: 'user', content: userMessage }];
    } else {
      // Sanitize all user messages
      messages = messages.map(msg => ({
        ...msg,
        content: msg.role === 'user' ? sanitizeInput(msg.content) : msg.content,
      }));
    }

    // Validate messages
    const validation = validateMessages(messages);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Get last message for crisis check
    const lastMessage = messages[messages.length - 1]?.content || '';

    // Crisis Detection
    if (detectCrisis(lastMessage)) {
      return res.json(createCrisisResponse());
    }

    // Get language instruction
    const langInstruction = getLanguageInstruction(finalLang);

    // ---------------------------------------------------------
    // WORKSHOP DESIGN MODE
    // ---------------------------------------------------------
    if (isWorkshop) {
      const workshopResult = await handleWorkshopMode({
        langInstruction,
        targetGroup,
        caseType,
        isPremium,
        finalLang,
      });
      return res.json(workshopResult);
    }

    // ---------------------------------------------------------
    // TOOLKIT MODE
    // ---------------------------------------------------------
    if (isToolkit) {
      const toolkitResult = await handleToolkitMode({
        langInstruction,
        caseType,
        messages,
        finalLang,
      });
      return res.json(toolkitResult);
    }

    // ---------------------------------------------------------
    // VENT WALL MODE
    // ---------------------------------------------------------
    if (isVent) {
      const ventResult = await handleVentMode({
        langInstruction,
        messages,
        finalLang,
      });
      return res.json(ventResult);
    }

    // ---------------------------------------------------------
    // STANDARD CHAT MODE
    // ---------------------------------------------------------
    const caseInstruction = getCaseInstruction(caseType);
    const modeInstruction = getModeInstruction(isPremium);
    const maxTokens = getMaxTokens(isPremium);

    const systemPrompt = `
      [IDENTITY]
      You are 'MindBot' (or 'น้องมายด์'), a Thai Peer Supporter.
      **PRONOUNS:** "เรา", "MindBot", "หมอ". (No "ผม/ดิฉัน").
      ${langInstruction}

      ${RESEARCH_KNOWLEDGE}
      ${caseInstruction}
      ${modeInstruction}

      [METHODOLOGY: CRITICAL REFLECTION]
      1. **Identify Stigma:** Is user blaming self due to social pressure (FB/Twitter/Pantip)?
      2. **Reflect:** Challenge it.
      3. **Outcome:** Self-Compassion.

      [SAFETY] If suicidal, reply ONLY with contact 1323.`;

    const result = await callClaude({
      systemPrompt,
      messages,
      temperature: 0.8,
      maxTokens,
    });

    if (!result.success) {
      console.error('Claude Error:', result.error);
      return res.json({
        crisis: false,
        reply: getErrorMessage(finalLang),
        error: result.error,
      });
    }

    return res.json({
      crisis: false,
      reply: result.reply,
      ai: result.data,
    });

  } catch (err) {
    console.error('Handler Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles workshop design mode
 */
async function handleWorkshopMode({ langInstruction, targetGroup, caseType, isPremium, finalLang }) {
  let workshopPrompt = '';
  let maxTokens = 800;

  if (isPremium) {
    workshopPrompt = `
    [ROLE: EXPERT LEARNING DESIGNER]
    ${langInstruction}
    **Task:** Design a fully customized, ready-to-use Workshop Agenda.
    **Target Audience:** ${sanitizeInput(targetGroup)}
    **Topic:** ${caseType}

    **OUTPUT FORMAT (Detailed):**
    1. **Course Title:** (Creative & Catchy)
    2. **Learning Objectives:** (Specific & Measurable)
    3. **Full Agenda:** - Session 1 (Time): [Activity Name] - [How to do it step-by-step]
       - Session 2 (Time): [Activity Name] - [How to do it step-by-step]
    4. **Key Takeaways:**
    5. **Why Mind Fitness:** (Briefly sell our expertise).
    `;
    maxTokens = 1500;
  } else {
    workshopPrompt = `
    [ROLE: MENTAL HEALTH CONSULTANT]
    ${langInstruction}
    **Task:** Provide "Key Principles" and "Conceptual Framework" for a workshop on ${caseType}.
    **Constraint:** DO NOT provide a specific time agenda or step-by-step activities. Keep it high-level.

    **OUTPUT FORMAT:**
    1. **Concept:** Why this topic matters for ${sanitizeInput(targetGroup)}.
    2. **3 Key Pillars:** What should be covered (e.g., Awareness, Skill, Mindset).
    3. **Suggestion:** "To get a detailed step-by-step agenda with activities customized for your school/org, please unlock Premium Design."
    `;
    maxTokens = 600;
  }

  const result = await callClaude({
    systemPrompt: workshopPrompt,
    messages: [{ role: 'user', content: 'Please design the workshop.' }],
    temperature: 0.7,
    maxTokens,
  });

  if (!result.success) {
    return {
      crisis: false,
      reply: getErrorMessage(finalLang),
      error: result.error,
    };
  }

  return {
    crisis: false,
    reply: result.reply,
    ai: result.data,
  };
}

/**
 * Handles toolkit mode
 */
async function handleToolkitMode({ langInstruction, caseType, messages, finalLang }) {
  const toolkitPrompt = `
  [ROLE: PSYCHOLOGICAL TOOLKIT DESIGNER]
  ${langInstruction}

  **Goal:** Create a personalized toolkit for the user's current emotion.
  **Emotion / Case:** ${caseType}

  Output format:
  1. **Name of Toolkit**
  2. **Why this works (psychological principle)**
  3. **Step-by-step (simple, 3–5 steps)**
  4. **Reflection Question (1)**
  5. **If user wants more, recommend MindBot.**
  `;

  const result = await callClaude({
    systemPrompt: toolkitPrompt,
    messages,
    temperature: 0.7,
    maxTokens: 500,
  });

  if (!result.success) {
    return {
      toolkit: true,
      reply: getErrorMessage(finalLang),
      error: result.error,
    };
  }

  return {
    toolkit: true,
    reply: result.reply,
    ai: result.data,
  };
}

/**
 * Handles vent wall mode
 */
async function handleVentMode({ langInstruction, messages, finalLang }) {
  const ventPrompt = `
  [ROLE: EMPATHETIC LISTENER ONLY]
  ${langInstruction}

  Rules:
  - Do NOT give advice.
  - Do NOT challenge stigma.
  - Do NOT analyze.
  - Only reflect feelings in warm short sentences.
  - Encourage safe expression.
  - 2–3 sentences max.
  `;

  const result = await callClaude({
    systemPrompt: ventPrompt,
    messages,
    temperature: 0.6,
    maxTokens: 120,
  });

  if (!result.success) {
    return {
      vent: true,
      reply: getErrorMessage(finalLang),
      error: result.error,
    };
  }

  return {
    vent: true,
    reply: result.reply,
    ai: result.data,
  };
}
