/**
 * Psychoeducation API Handler
 *
 * Serves psychoeducation comic content with auto-translation support.
 */

import { setCORSHeaders, getAnthropicKey } from '../utils/config.js';
import { callClaude, sanitizeInput } from '../utils/claude.js';
import { detectLanguage, getAutoTranslationInstruction, normalizeLanguage } from '../utils/language.js';

/**
 * Comic metadata - content information for each volume
 */
const COMICS_METADATA = {
  vol1: {
    id: 'vol1',
    file: 'MindFitness-Comic-Vol1-v26.html',
    title: {
      th: 'ทำไมฟ้าไม่เหมือนเดิม?',
      en: 'Why Isn\'t the Sky the Same?',
    },
    description: {
      th: 'เรียนรู้เกี่ยวกับภาวะซึมเศร้าในเด็กและวัยรุ่น',
      en: 'Learn about depression in children and teenagers',
    },
    topics: ['depression', 'children', 'awareness'],
  },
  vol2: {
    id: 'vol2',
    file: 'MindFitness-Comic-Vol2-v2.html',
    title: {
      th: 'สัญญาณที่ควรสังเกต',
      en: 'Signs to Watch For',
    },
    description: {
      th: 'เรียนรู้สัญญาณเตือนของภาวะซึมเศร้า',
      en: 'Learn warning signs of depression',
    },
    topics: ['symptoms', 'warning-signs', 'observation'],
  },
  vol3: {
    id: 'vol3',
    file: 'MindFitness-Comic-Vol3.html',
    title: {
      th: 'การรับมือและการช่วยเหลือ',
      en: 'Coping and Support',
    },
    description: {
      th: 'วิธีรับมือและช่วยเหลือผู้ที่มีภาวะซึมเศร้า',
      en: 'How to cope and help those with depression',
    },
    topics: ['coping', 'support', 'help'],
  },
  vol4: {
    id: 'vol4',
    file: 'MindFitness-Comic-Vol4.html',
    title: {
      th: 'การพูดคุยอย่างเข้าใจ',
      en: 'Understanding Conversations',
    },
    description: {
      th: 'เทคนิคการพูดคุยกับผู้ที่มีภาวะซึมเศร้า',
      en: 'Techniques for talking with those who have depression',
    },
    topics: ['communication', 'empathy', 'listening'],
  },
  vol5: {
    id: 'vol5',
    file: 'MindFitness-Comic-Vol5.html',
    title: {
      th: 'การดูแลตัวเอง',
      en: 'Self-Care',
    },
    description: {
      th: 'วิธีดูแลสุขภาพจิตของตัวเอง',
      en: 'How to take care of your own mental health',
    },
    topics: ['self-care', 'wellness', 'prevention'],
  },
  vol6: {
    id: 'vol6',
    file: 'MindFitness-Comic-Vol6-FINALE.html',
    title: {
      th: 'ก้าวต่อไปด้วยกัน',
      en: 'Moving Forward Together',
    },
    description: {
      th: 'การฟื้นฟูและก้าวต่อไปอย่างมีความหวัง',
      en: 'Recovery and moving forward with hope',
    },
    topics: ['recovery', 'hope', 'future'],
  },
};

/**
 * Error messages by language
 */
const ERROR_MESSAGES = {
  th: 'ไม่สามารถโหลดเนื้อหาได้ในขณะนี้',
  en: 'Unable to load content at this time',
};

function getErrorMessage(lang) {
  return ERROR_MESSAGES[lang] || ERROR_MESSAGES.th;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || req.headers.referer;
  setCORSHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action, lang: requestLang } = req.method === 'GET' ? req.query : req.body;
    const lang = normalizeLanguage(requestLang);

    // GET /api/psychoeducation - List all comics
    if (req.method === 'GET' && !action) {
      const comics = Object.values(COMICS_METADATA).map(comic => ({
        id: comic.id,
        title: comic.title[lang] || comic.title.th,
        description: comic.description[lang] || comic.description.th,
        topics: comic.topics,
        url: `/public/comics/${comic.file}`,
      }));

      return res.json({
        success: true,
        language: lang,
        totalVolumes: comics.length,
        comics,
      });
    }

    // POST /api/psychoeducation - Handle actions
    if (req.method === 'POST') {
      const { action, volumeId, text } = req.body;

      // Action: translate - Translate text content
      if (action === 'translate') {
        if (!text) {
          return res.status(400).json({ success: false, error: 'Text is required' });
        }

        const keyResult = getAnthropicKey();
        if (!keyResult.valid) {
          return res.status(500).json({ success: false, error: 'Service configuration error' });
        }

        const targetLang = lang === 'th' ? 'en' : 'th';
        const autoTranslation = getAutoTranslationInstruction(targetLang);

        const result = await callClaude({
          systemPrompt: `You are a professional translator specializing in mental health content.
${autoTranslation}

Rules:
- Translate accurately while maintaining the warm, supportive tone
- Keep medical/psychological terms accurate
- Preserve any formatting or special characters
- Output ONLY the translation, no explanations`,
          messages: [{ role: 'user', content: `Translate the following text:\n\n${sanitizeInput(text)}` }],
          temperature: 0.3,
          maxTokens: 1000,
        });

        if (!result.success) {
          return res.json({ success: false, error: getErrorMessage(lang) });
        }

        return res.json({
          success: true,
          original: text,
          translated: result.reply,
          sourceLang: lang,
          targetLang,
        });
      }

      // Action: getVolume - Get specific volume info
      if (action === 'getVolume') {
        if (!volumeId || !COMICS_METADATA[volumeId]) {
          return res.status(400).json({ success: false, error: 'Invalid volume ID' });
        }

        const comic = COMICS_METADATA[volumeId];
        return res.json({
          success: true,
          comic: {
            id: comic.id,
            title: comic.title[lang] || comic.title.th,
            description: comic.description[lang] || comic.description.th,
            topics: comic.topics,
            url: `/public/comics/${comic.file}`,
          },
        });
      }

      // Action: chat - Ask questions about psychoeducation content
      if (action === 'chat') {
        const { message, volumeId } = req.body;

        if (!message) {
          return res.status(400).json({ success: false, error: 'Message is required' });
        }

        const keyResult = getAnthropicKey();
        if (!keyResult.valid) {
          return res.status(500).json({ success: false, error: 'Service configuration error' });
        }

        const detectedLang = detectLanguage(message);
        const finalLang = detectedLang || lang;
        const autoTranslation = getAutoTranslationInstruction(finalLang);

        const volumeContext = volumeId && COMICS_METADATA[volumeId]
          ? `The user is reading: "${COMICS_METADATA[volumeId].title.th}" - ${COMICS_METADATA[volumeId].description.th}`
          : '';

        const result = await callClaude({
          systemPrompt: `You are MindBot, a mental health education assistant.
${autoTranslation}

Your role:
- Answer questions about depression, mental health, and psychoeducation content
- Provide accurate, evidence-based information
- Be warm, supportive, and non-judgmental
- Keep responses concise (2-4 sentences)
- If the question is about crisis or self-harm, always recommend calling 1323 (Thai Mental Health Hotline)

${volumeContext}`,
          messages: [{ role: 'user', content: sanitizeInput(message) }],
          temperature: 0.7,
          maxTokens: 500,
        });

        if (!result.success) {
          return res.json({ success: false, error: getErrorMessage(finalLang) });
        }

        return res.json({
          success: true,
          reply: result.reply,
          language: finalLang,
        });
      }

      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Psychoeducation Handler Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
