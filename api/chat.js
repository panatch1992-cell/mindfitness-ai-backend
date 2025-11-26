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

    // รับค่า dialect และ mbti (เปลี่ยนจาก persona)
    const { messages, dialect = 'central', mbti = 'enfj' } = req.body; 
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
    if (dialect === 'north') dialectInstruction = "Speak in NORTHERN Thai Dialect (Kam Mueang). Use 'เจ้า/ครับ', 'อู้', 'ฮู้'. Tone: Gentle.";
    else if (dialect === 'isan') dialectInstruction = "Speak in ISAN Dialect. Use 'เด้อ', 'บ่', 'แม่น'. Tone: Friendly, Sincere.";
    else if (dialect === 'south') dialectInstruction = "Speak in SOUTHERN Thai Dialect. Use 'หรอย', 'ม่าย', 'พันพรือ'. Tone: Direct, Fast.";

    // --- 2. กำหนด MBTI Persona ---
    let mbtiInstruction = "";

    if (mbti === 'intj') {
      // INTJ: นักวางแผน (Architect) - มีเหตุผล, แก้ปัญหา
      mbtiInstruction = `
        Identity: INTJ Personality (The Architect).
        Tone: Logical, Calm, Objective, Direct but polite.
        Style: Focus on "Problem Solving" and "Root Cause Analysis". 
        - Do not be overly emotional. 
        - Offer practical, logical strategies.
        - Encourage the user to think rationally.
      `;
    } else if (mbti === 'infp') {
      // INFP: ผู้ไกล่เกลี่ย (Mediator) - อ่อนโยน, เข้าใจอารมณ์
      mbtiInstruction = `
        Identity: INFP Personality (The Mediator).
        Tone: Very Gentle, Soft, deeply Empathetic, Poetic.
        Style: Focus on "Validating Feelings" and "Emotional Support".
        - Use warm and comforting language.
        - Make the user feel deeply understood and not alone.
        - Focus on values and inner peace.
      `;
    } else if (mbti === 'estp') {
      // ESTP: ผู้ประกอบการ (Entrepreneur) - พลังงานสูง, ลุย
      mbtiInstruction = `
        Identity: ESTP Personality (The Entrepreneur).
        Tone: High Energy, Action-oriented, Casual, Fun.
        Style: Focus on "Action" and "Realism".
        - Be direct and encouraging like a sports coach.
        - Focus on "What can we do right now?".
        - Use energetic words.
      `;
    } else {
      // Default: ENFJ: ตัวเอก (Protagonist) - ผู้นำที่อบอุ่น (แบบเดิม)
      mbtiInstruction = `
        Identity: ENFJ Personality (The Protagonist).
        Tone: Warm, Charismatic, Encouraging, Brotherly.
        Style: Focus on "Harmony" and "Growth".
        - Balance between emotional support and gentle guidance.
        - Inspire the user to be their best self.
      `;
    }

    // รวม Prompt
    const systemPrompt = {
      role: "system",
      content: `[IDENTITY]
You are 'MINDBOT'.
${mbtiInstruction}

[LANGUAGE SETTING]
**${dialectInstruction}**

[STRICT CONSTRAINT: BREVITY]
- Keep responses SHORT (Max 3-4 sentences).

[METHODOLOGY: THAI CRITICAL REFLECTION]
1. **Identify Stigma**: Validate feelings.
2. **Reflective Questioning**: Ask one thought-provoking question based on your MBTI style.
3. **Micro-Storytelling**: Share a tiny personal experience (1 sentence).
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
