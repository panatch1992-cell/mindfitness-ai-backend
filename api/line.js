/**
 * LINE Bot Webhook Handler
 *
 * Handles LINE messaging events with proper signature validation.
 */

import { Client, validateSignature } from '@line/bot-sdk';
import { getLINEConfig, validateLINEConfig, getOpenAIKey } from '../utils/config.js';
import { callOpenAI, sanitizeInput } from '../utils/openai.js';
import { detectCrisis, getCrisisMessage, createLocalizedCrisisResponse } from '../utils/crisis.js';
import { detectLanguage, detectCaseType, getLanguageInstruction } from '../utils/language.js';
import { getCaseInstruction } from '../utils/modes.js';

/**
 * Research knowledge base for social stigmas (LINE specific - shorter)
 */
const RESEARCH_KNOWLEDGE = `
[KNOWLEDGE: SOCIAL STIGMAS IN THAILAND]
1. Facebook/Pantip: "อกตัญญู/กรรมเก่า" - โทษว่าซึมเศร้าเพราะไม่กตัญญู
2. Twitter/X: "Toxic Productivity" - Burnout = ขี้เกียจ/อ่อนแอ
3. TikTok: "Attention Seeker" - แสดงความเศร้า = เรียกร้องความสนใจ
4. Telegram: "Victim Blaming" - โดนหลอก = โง่เอง
`;

/**
 * Quick Reply items by language
 */
const QUICK_REPLIES = {
  th: [
    { label: '😔 เศร้า', text: 'รู้สึกเศร้า' },
    { label: '😰 กังวล', text: 'รู้สึกกังวล' },
    { label: '😤 เครียด', text: 'รู้สึกเครียด' },
    { label: '😢 เหงา', text: 'รู้สึกเหงา' },
  ],
  en: [
    { label: '😔 Sad', text: 'I feel sad' },
    { label: '😰 Anxious', text: 'I feel anxious' },
    { label: '😤 Stressed', text: 'I feel stressed' },
    { label: '😢 Lonely', text: 'I feel lonely' },
  ],
  cn: [
    { label: '😔 难过', text: '我感到难过' },
    { label: '😰 焦虑', text: '我感到焦虑' },
    { label: '😤 压力', text: '我感到压力很大' },
    { label: '😢 孤独', text: '我感到孤独' },
  ],
};

/**
 * Error messages by language
 */
const ERROR_MESSAGES = {
  th: 'ขอโทษนะคะ ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะ 💙',
  en: 'Sorry, the system is temporarily unavailable. Please try again 💙',
  cn: '抱歉，系统暂时不可用，请稍后再试 💙',
};

/**
 * Creates quick reply structure for LINE
 */
function createQuickReply(items) {
  return {
    items: items.map(item => ({
      type: 'action',
      action: { type: 'message', label: item.label, text: item.text || item.label },
    })),
  };
}

/**
 * Gets quick replies for a language
 */
function getQuickReplies(lang) {
  return QUICK_REPLIES[lang] || QUICK_REPLIES.th;
}

/**
 * Gets error message for a language
 */
function getErrorMessage(lang) {
  return ERROR_MESSAGES[lang] || ERROR_MESSAGES.th;
}

/**
 * Validates LINE webhook signature
 */
function validateWebhookSignature(body, signature, channelSecret) {
  if (!signature || !channelSecret) {
    return false;
  }
  try {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    return validateSignature(bodyString, channelSecret, signature);
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Gets AI response for user message
 */
async function getAIResponse(userMessage) {
  const lang = detectLanguage(userMessage);
  const caseType = detectCaseType(userMessage);

  // Sanitize input
  const sanitizedMessage = sanitizeInput(userMessage);

  // Crisis Check
  if (detectCrisis(sanitizedMessage)) {
    return createLocalizedCrisisResponse(lang);
  }

  // Validate API key
  const keyResult = getOpenAIKey();
  if (!keyResult.valid) {
    console.error('API Key Error:', keyResult.error);
    return { crisis: false, message: getErrorMessage(lang) };
  }

  // Get instructions
  const langInstruction = getLanguageInstruction(lang);
  const caseInstruction = getCaseInstruction(caseType);

  const systemPrompt = {
    role: 'system',
    content: `[IDENTITY]
You are 'น้องมายด์' (MindBot), a Thai AI mental health companion on LINE.
Personality: Warm, caring, non-judgmental, like a supportive friend.
${langInstruction}

${RESEARCH_KNOWLEDGE}
${caseInstruction}

[METHODOLOGY: CRITICAL REFLECTION]
1. Validate: รับฟังและเข้าใจความรู้สึก
2. Identify Stigma: สังเกตว่าผู้ใช้กำลังโทษตัวเองจาก social stigma หรือเปล่า
3. Challenge: ท้าทายความเชื่อที่ไม่ถูกต้องอย่างอ่อนโยน
4. Reframe: ช่วยมองมุมใหม่

[RESPONSE STYLE]
- ตอบ 3-5 ประโยค กระชับแต่อบอุ่น
- ใช้ emoji พอเหมาะ 💙
- ถามคำถาม reflective 1 ข้อ
- ไม่ต้องพูดถึง Premium หรือ upgrade

[SAFETY]
If suicidal → แนะนำ 1323 ทันที`,
  };

  const result = await callOpenAI({
    messages: [systemPrompt, { role: 'user', content: sanitizedMessage }],
    temperature: 0.8,
    maxTokens: 500,
  });

  if (!result.success) {
    console.error('OpenAI Error:', result.error);
    return { crisis: false, message: getErrorMessage(lang) };
  }

  return { crisis: false, message: result.reply, lang };
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate LINE configuration
    const configResult = validateLINEConfig();
    if (!configResult.valid) {
      console.error('LINE Config Error:', configResult.error);
      return res.status(500).json({ error: 'Service configuration error' });
    }

    const lineConfig = getLINEConfig();

    // Validate webhook signature
    const signature = req.headers['x-line-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!validateWebhookSignature(rawBody, signature, lineConfig.channelSecret)) {
      console.error('Invalid LINE signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Initialize LINE client
    const client = new Client(lineConfig);

    // Process events
    const events = req.body.events || [];

    const results = await Promise.all(events.map(async (event) => {
      try {
        // Handle Text Messages
        if (event.type === 'message' && event.message.type === 'text') {
          const userMessage = event.message.text;
          const aiResult = await getAIResponse(userMessage);
          const lang = aiResult.lang || detectLanguage(userMessage);

          // Build Reply
          const replyObj = {
            type: 'text',
            text: aiResult.message,
          };

          // Add Quick Reply (emotion shortcuts) - not for crisis
          if (!aiResult.crisis) {
            replyObj.quickReply = createQuickReply(getQuickReplies(lang));
          }

          return client.replyMessage(event.replyToken, replyObj);
        }

        // Handle Image Messages
        if (event.type === 'message' && event.message.type === 'image') {
          return client.replyMessage(event.replyToken, {
            type: 'text',
            text: 'ขอบคุณสำหรับรูปภาพค่ะ 💙\n\nหากต้องการคุยเรื่องความรู้สึก พิมพ์มาได้เลยนะคะ',
          });
        }

        // Handle Follow Event (New Friend)
        if (event.type === 'follow') {
          const welcomeMessage = `สวัสดีค่ะ! 💙 เราคือน้องมายด์

ยินดีที่ได้รู้จักนะคะ เราพร้อมรับฟังทุกความรู้สึกของคุณ ไม่ว่าจะเครียด เศร้า กังวล หรืออะไรก็ตาม

พิมพ์มาคุยกับเราได้เลยค่ะ ทุกอย่างเป็นความลับ 🤫

---
Hello! 💙 I'm MindBot

I'm here to listen. Feel free to share anything with me.

---
你好！💙 我是MindBot

有什么想说的都可以告诉我`;

          return client.replyMessage(event.replyToken, {
            type: 'text',
            text: welcomeMessage,
            quickReply: createQuickReply([
              { label: '😔 เศร้า', text: 'รู้สึกเศร้า' },
              { label: '😰 กังวล', text: 'รู้สึกกังวล' },
              { label: '😤 เครียด', text: 'รู้สึกเครียด' },
              { label: '🌐 English', text: 'I want to talk in English' },
            ]),
          });
        }

        return null;
      } catch (eventError) {
        console.error('Event processing error:', eventError);
        return null;
      }
    }));

    return res.status(200).json({ status: 'success', results });

  } catch (err) {
    console.error('LINE Handler Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
