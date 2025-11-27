import fetch from "node-fetch";
import { Redis } from "@upstash/redis";

// เชื่อมต่อ Redis (สำหรับ Rate Limit)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || "unknown";
}

// Crisis Detection
const crisisPatterns = [/ฆ่าตัวตาย/i, /อยากตาย/i, /suicide/i, /ไม่อยากอยู่/i];
function detectCrisis(text) { return crisisPatterns.some(r => r.test(text)); }

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*"); 
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const ip = getClientIp(req);
    
    // 1. Redis Rate Limiting (ป้องกันสแปม)
    const limitKey = `rate_limit:${ip}`;
    const currentUsage = await redis.incr(limitKey);
    if (currentUsage === 1) {
        await redis.expire(limitKey, 60); // รีเซ็ตทุก 60 วินาที
    }
    if (currentUsage > 40) {
        return res.status(429).json({ error: "Too many requests" });
    }

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const { messages, caseType = 'general', isPremium = false } = req.body; 
    const lastMessage = messages[messages.length - 1]?.content || "";

    if (detectCrisis(lastMessage)) {
      return res.json({
        crisis: true,
        message: "CRISIS_DETECTED",
        resources: [
          { country: "Thailand", name: "สายด่วนสุขภาพจิต 1323", info: "โทร 1323 ฟรี 24 ชม." },
          { name: "Samaritans", info: "โทร 02-713-6793" }
        ]
      });
    }

    // --- Knowledge Base (Stigma & Research) ---
    const researchKnowledge = `
    [KNOWLEDGE BASE: THAI CONTEXT]
    1. **Social Stigmas:**
       - "Toxic Positivity" (Facebook/Pantip): Belief that sadness is a sin/ungrateful.
       - "Attention Seeker" (TikTok/X): Accusation that mental health issues are fake trends.
       - "Victim Blaming" (Telegram/Scams): Feeling stupid after being scammed.
    2. **Protocol:** Identify Stigma -> Reflect -> Reframe -> Action.
    `;

    // --- Case Context (Emotion Based) ---
    let caseInstruction = "";
    switch (caseType) {
        case 'anxiety': caseInstruction = `[CASE: ANXIETY] Focus: Restless, Overthinking. Stigma: "Crazy". Goal: Grounding.`; break;
        case 'sadness': caseInstruction = `[CASE: SADNESS] Focus: Low energy, Anhedonia. Stigma: "Lazy". Goal: Acceptance.`; break;
        case 'anger': caseInstruction = `[CASE: ANGER] Focus: Frustration. Stigma: "Bad person". Goal: Healthy vent.`; break;
        case 'guilt': caseInstruction = `[CASE: GUILT] Focus: Self-blame. Stigma: "My fault". Goal: Forgiveness.`; break;
        case 'fear': caseInstruction = `[CASE: FEAR] Focus: Insecurity. Goal: Safety.`; break;
        case 'embarrassment': caseInstruction = `[CASE: SHAME] Focus: Hiding. Goal: Normalization.`; break;
        case 'relationship': caseInstruction = `[CASE: RELATIONSHIP] Focus: Heartbreak. Stigma: "Unlovable".`; break;
        default: caseInstruction = `[CASE: GENERAL] Focus: Listening.`;
    }

    // --- Mode Instruction ---
    let modeInstruction = isPremium 
        ? `[MODE: PREMIUM DEEP DIVE] Act as Senior Analyst. Deconstruct Stigma using DSM-5 & Research. Length: 5-8 sentences.`
        : `[MODE: FREE BASIC SUPPORT] Validate feeling -> Identify Stigma -> Ask 1 Reflective Question. Upsell Premium if asked for solution. Length: 3-4 sentences.`;

    const systemPrompt = {
      role: "system",
      content: `
      [IDENTITY]
      You are 'MindBot' (or 'น้องมายด์'), a Thai Peer Supporter.
      **PRONOUNS:** Use "เรา", "MindBot", "หมอ", or "น้องมายด์". Avoid "ผม/ดิฉัน".
      **TONE:** Gender-neutral, warm, supportive. Mirror the user's politeness.
      
      ${researchKnowledge}
      ${caseInstruction}
      ${modeInstruction}

      [METHODOLOGY: CRITICAL REFLECTION]
      1. **Identify:** Is the user blaming themselves?
      2. **Reflect:** Challenge the stigma.
      3. **Reframe:** Shift to self-compassion.

      [SAFETY] If suicidal, reply ONLY with contact 1323.`
    };

    const payload = {
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
      temperature: 0.8, 
      max_tokens: isPremium ? 1500 : 600
    };

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const aiData = await aiResp.json();
    return res.json({ crisis: false, ai: aiData });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
