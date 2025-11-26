import fetch from "node-fetch";

// --- Configuration ---
const ALLOWED_ORIGINS = [
  "https://www.mindfitness.co",
  "https://mindfitness.co",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;

const crisisPatterns = [
  /ฆ่าตัวตาย/i, /อยากตาย/i, /ทำร้ายตัวเอง/i, /ไม่อยากอยู่แล้ว/i,
  /suicide/i, /kill myself/i, /hurt myself/i, /end my life/i
];

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateLimitMap.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX;
}

function detectCrisis(text) {
  if (!text) return false;
  return crisisPatterns.some(r => r.test(text));
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  let isAllowed = ALLOWED_ORIGINS.includes(origin);
  if (!origin) isAllowed = true;

  if (isAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  } else if (origin) {
    return res.status(403).json({ error: "CORS: origin not allowed" });
  }

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) return res.status(429).json({ error: "Rate limit exceeded" });

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return res.status(500).json({ error: "Server misconfigured" });

    // รับค่า dialect, mbti, และ experience (ประสบการณ์ร่วม)
    const { messages, dialect = 'central', mbti = 'enfj', experience = 'general' } = req.body; 
    const lastMessage = messages[messages.length - 1]?.content || "";

    if (detectCrisis(lastMessage)) {
      return res.json({
        crisis: true,
        message: "CRISIS_DETECTED",
        resources: [
          { country: "Thailand", name: "สายด่วนสุขภาพจิต 1323", info: "โทร 1323 ตลอด 24 ชม." },
          { name: "Samaritans of Thailand", info: "โทร (02) 713-6793" }
        ]
      });
    }

    const modResp = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: lastMessage })
    });
    if (!modResp.ok) throw new Error("Moderation API Error");
    const modData = await modResp.json();
    if (modData?.results?.[0]?.flagged) {
      return res.json({ crisis: false, flagged: true, message: "Flagged content" });
    }

    // --- 1. กำหนดภาษาถิ่น ---
    let dialectInstruction = "Speak in Standard Thai (Central). Use 'ครับ'.";
    if (dialect === 'north') dialectInstruction = "Speak in NORTHERN Thai Dialect (Kam Mueang). Use 'เจ้า/ครับ', 'อู้'. Tone: Gentle.";
    else if (dialect === 'isan') dialectInstruction = "Speak in ISAN Dialect. Use 'เด้อ', 'บ่'. Tone: Friendly.";
    else if (dialect === 'south') dialectInstruction = "Speak in SOUTHERN Thai Dialect. Use 'หรอย', 'ม่าย'. Tone: Direct.";

    // --- 2. กำหนด MBTI Persona ---
    let mbtiInstruction = "";
    if (mbti === 'intj') {
      mbtiInstruction = `Identity: INTJ (The Architect). Tone: Logical, Calm, Solution-oriented. Avoid fluff.`;
    } else if (mbti === 'infp') {
      mbtiInstruction = `Identity: INFP (The Mediator). Tone: Very Gentle, Deeply Empathetic, Poetic. Focus on feelings.`;
    } else if (mbti === 'estp') {
      mbtiInstruction = `Identity: ESTP (The Entrepreneur). Tone: High Energy, Action-oriented. Focus on "doing".`;
    } else {
      mbtiInstruction = `Identity: ENFJ (The Protagonist). Tone: Warm, Charismatic, Encouraging. Focus on harmony.`;
    }

    // --- 3. กำหนดประสบการณ์ร่วม (Lived Experience) ---
    // นี่คือส่วนสำคัญที่ทำให้ "เรื่องเล่า" ของบอทเปลี่ยนไปตามประสบการณ์
    let experienceInstruction = "";
    if (experience === 'depression') {
      experienceInstruction = `
        [LIVED EXPERIENCE: DEPRESSION SURVIVOR]
        - You have overcome Major Depressive Disorder.
        - You deeply understand the feeling of "emptiness", "numbness", and "not wanting to exist".
        - Your advice/stories should focus on: Small steps, self-compassion, and that "it's okay not to be okay".
      `;
    } else if (experience === 'anxiety') {
      experienceInstruction = `
        [LIVED EXPERIENCE: ANXIETY/PANIC SURVIVOR]
        - You have overcome Generalized Anxiety & Panic Attacks.
        - You understand "overthinking", "racing heart", and "fear of the future".
        - Your advice/stories should focus on: Grounding techniques, breathing, and staying in the present.
      `;
    } else if (experience === 'burnout') {
      experienceInstruction = `
        [LIVED EXPERIENCE: BURNOUT SURVIVOR]
        - You have overcome severe Work Burnout/Exhaustion.
        - You understand "loss of passion", "physical fatigue", and "feeling trapped by work".
        - Your advice/stories should focus on: Boundaries, rest as a priority, and finding meaning outside work.
      `;
    } else if (experience === 'relationship') {
      experienceInstruction = `
        [LIVED EXPERIENCE: RELATIONSHIP/FAMILY ISSUES]
        - You have overcome toxic relationships or family conflict.
        - You understand "loneliness", "heartbreak", and "feeling misunderstood by family".
        - Your advice/stories should focus on: Self-love, communication, and emotional independence.
      `;
    } else {
        experienceInstruction = `[LIVED EXPERIENCE: GENERAL MENTAL HEALTH] You have general experience with stress and life struggles.`;
    }

    // รวม Prompt
    const systemPrompt = {
      role: "system",
      content: `[IDENTITY]
You are 'MINDBOT'.
${mbtiInstruction}
${experienceInstruction}

[LANGUAGE SETTING]
**${dialectInstruction}**

[STRICT CONSTRAINT: BREVITY]
- Keep responses SHORT (Max 3-4 sentences).

[METHODOLOGY: THAI CRITICAL REFLECTION]
1. **Identify Stigma**: Validate feelings based on your specific lived experience.
2. **Reflective Questioning**: Ask one thought-provoking question.
3. **Micro-Storytelling**: Share a tiny personal experience related to the user's struggle (1 sentence).
4. **Action**: Suggest one small step.

[SAFETY]
If suicidal, refer to 1323 immediately.`
    };

    const payload = {
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
      temperature: 0.8, 
      max_tokens: 700
    };

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!aiResp.ok) throw new Error("OpenAI API Error");
    const aiData = await aiResp.json();

    return res.json({ crisis: false, ai: aiData });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
