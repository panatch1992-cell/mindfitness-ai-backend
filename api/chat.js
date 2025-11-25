import fetch from "node-fetch";

// --- Configuration ---
// รายชื่อโดเมนที่อนุญาตให้เรียก API นี้ได้ (Whitelist)
const ALLOWED_ORIGINS = [
  "https://www.mindfitness.co",      // โดเมนหลัก
  "https://mindfitness.co",          // เผื่อเข้าแบบไม่มี www
  "http://localhost:3000",           // สำหรับทดสอบในเครื่อง (Localhost)
  "http://127.0.0.1:3000"            // สำหรับทดสอบในเครื่อง (IP)
];

// Simple in-memory rate-limiter (per IP)
// หมายเหตุ: บน Serverless (Vercel) ตัวแปรนี้อาจถูกรีเซ็ตบ่อย แต่ช่วยกัน Spam ได้ระดับหนึ่ง
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 นาที
const RATE_LIMIT_MAX = 30; // จำนวนครั้งสูงสุดต่อนาทีต่อ IP

// คำที่บ่งบอกถึงภาวะวิกฤต (Crisis keywords)
const crisisPatterns = [
  /ฆ่าตัวตาย/i, /อยากตาย/i, /ทำร้ายตัวเอง/i, /ไม่อยากอยู่แล้ว/i,
  /suicide/i, /kill myself/i, /hurt myself/i, /end my life/i
];

// --- Helper Functions ---

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

// --- Main Handler ---

export default async function handler(req, res) {
  // 1. CORS Management
  const origin = req.headers.origin || "";
  console.log(`[API] Incoming request from origin: '${origin}'`); // Log เพื่อดูว่าใครเรียกมา

  // ตรวจสอบว่า Origin นี้ได้รับอนุญาตหรือไม่
  let isAllowed = ALLOWED_ORIGINS.includes(origin);
  
  // กรณีพิเศษ: ถ้าไม่มี Origin (Server-to-Server) หรือเป็น Localhost ที่เราอยากอนุญาตเพิ่ม
  if (!origin) isAllowed = true; 

  if (isAllowed && origin) {
    // ถ้าอนุญาต ให้ส่ง Header กลับไปตาม Origin ที่ส่งมา
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  } else if (origin) {
    // ถ้าไม่อนุญาต ให้ Log เตือนไว้ (ดูใน Vercel Log)
    console.warn(`[CORS Blocked] Origin: ${origin} is not in whitelist.`);
    // ยังไม่ return error ทันทีในบางเคส แต่ถ้าเคร่งครัดคือตัดจบเลย:
    return res.status(403).json({ error: "CORS: origin not allowed" });
  }

  // 2. Handle Preflight Request (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 3. Method Check (Only POST allowed)
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const ip = getClientIp(req);
    
    // 4. Rate Limiting Check
    if (isRateLimited(ip)) {
      console.warn(`[Rate Limit] IP: ${ip} exceeded limit.`);
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    // 5. Check API Key
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) {
      console.error("[Config Error] Missing OPENAI_API_KEY env variable.");
      return res.status(500).json({ error: "Server misconfigured: API Key missing" });
    }

    const messages = (req.body && req.body.messages) || [];
    const lastMessage = messages[messages.length - 1]?.content || "";

    // 6. Crisis Detection (Local Regex)
    if (detectCrisis(lastMessage)) {
      console.log(`[Crisis Detected] IP: ${ip}`);
      return res.json({
        crisis: true,
        message: "CRISIS_DETECTED",
        resources: [
          { country: "Thailand", name: "สายด่วนสุขภาพจิต 1323", info: "โทร 1323 ตลอด 24 ชม." },
          { name: "Samaritans of Thailand", info: "โทร (02) 713-6793" }
        ]
      });
    }

    // 7. OpenAI Moderation API
    const modResp = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input: lastMessage })
    });

    if (!modResp.ok) {
        throw new Error(`OpenAI Moderation API error: ${modResp.statusText}`);
    }

    const modData = await modResp.json();
    const flagged = modData?.results?.[0]?.flagged || false;

    if (flagged) {
      console.warn(`[Content Flagged] IP: ${ip} - Content blocked by OpenAI Moderation.`);
      return res.json({ crisis: false, flagged: true, message: "Content flagged by moderation system." });
    }

    // 8. Prepare Chat Completion
    const systemPrompt = {
      role: "system",
      content: `You are an empathetic, non-judgmental mental health support assistant. 
You are NOT a clinician. Provide supportive listening, validation, and safe coping strategies (breathing, grounding, seeking social support).
Do NOT give medical diagnoses, prescribe medication, or provide step-by-step clinical procedures.
If the user expresses suicidal ideation or immediate harm, instruct them to contact local emergency services and hotlines immediately.
Reply in the same language as the user (mostly Thai). Keep answers concise, warm, and supportive.`
    };

    const payload = {
      model: "gpt-4o-mini", // หรือใช้ gpt-3.5-turbo ถ้าต้องการประหยัด
      messages: [systemPrompt, ...messages],
      temperature: 0.6,
      max_tokens: 700
    };

    // 9. Call OpenAI Chat API
    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!aiResp.ok) {
        const errData = await aiResp.text();
        console.error(`[OpenAI API Error] ${aiResp.status}: ${errData}`);
        throw new Error(`OpenAI Chat API error: ${aiResp.statusText}`);
    }

    const aiData = await aiResp.json();

    // Log success (without PII content)
    console.log(JSON.stringify({
        status: "success",
        ip: ip === "unknown" ? "unknown" : "masked",
        model: payload.model,
        tokens: aiData.usage?.total_tokens
    }));

    return res.json({ crisis: false, ai: aiData });

  } catch (err) {
    console.error("[Server Error]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
