import fetch from "node-fetch";

// Simple in-memory rate-limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
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

// Crisis detection text patterns
const crisisPatterns = [
  /ฆ่าตัวตาย/i, /อยากตาย/i, /ทำร้ายตัวเอง/i,
  /suicide/i, /kill myself/i, /hurt myself/i
];

function detectCrisis(text) {
  if (!text) return false;
  return crisisPatterns.some(r => r.test(text));
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://www.mindfitness.co",
  "https://mindfitness.co",
  "http://www.mindfitness.co",
  "http://mindfitness.co",
  "https://mindfitness-ai.vercel.app",
  "https://mindfitness-ai-backend-4lfy.vercel.app"
];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";

  // Set CORS headers
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // FIX: Proper CORS preflight response
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) {
      return res.status(500).json({
        error: "Server misconfigured: missing OPENAI_API_KEY"
      });
    }

    const messages = req.body?.messages || [];
    const last = messages[messages.length - 1]?.content || "";

    // Crisis detection
    if (detectCrisis(last)) {
      return res.json({
        crisis: true,
        message: "CRISIS_DETECTED",
        resources: [
          { country: "Thailand", name: "สายด่วนสุขภาพจิต 1323", info: "โทร 1323 ตลอด 24 ชม." },
          { name: "Samaritans of Thailand (Bangkok)", info: "โทร (02) 713-6793" }
        ]
      });
    }

    // Moderation
    const modResp = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input: last })
    });

    const modData = await modResp.json();
    const flagged = modData?.results?.[0]?.flagged || false;

    if (flagged) {
      return res.json({
        crisis: false,
        flagged: true,
        message: "Content flagged by moderation"
      });
    }

    // System prompt
    const systemPrompt = {
      role: "system",
      content: `You are an empathetic, non-judgmental mental health support assistant.
You are NOT a clinician. Provide supportive listening only.
If the user expresses self-harm or danger, tell them to contact emergency services.
Respond in Thai when the user writes in Thai.`
    };

    // Chat completion payload
    const payload = {
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
      temperature: 0.6,
      max_tokens: 700
    };

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const aiData = await aiResp.json();

    return res.json({ crisis: false, ai: aiData });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

