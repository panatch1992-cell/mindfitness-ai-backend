import fetch from "node-fetch";

const ALLOWED_ORIGINS = [
  "https://www.mindfitness.co",
  "https://mindfitness.co",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

const rateLimitMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > 60000) { entry.count = 0; entry.start = now; }
  entry.count += 1;
  rateLimitMap.set(ip, entry);
  return entry.count > 40; // ผ่อนปรนให้หน่อยเผื่อคุยมันส์
}

const crisisPatterns = [/ฆ่าตัวตาย/i, /อยากตาย/i, /ทำร้ายตัวเอง/i, /suicide/i];
function detectCrisis(text) { return crisisPatterns.some(r => r.test(text)); }

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  let isAllowed = ALLOWED_ORIGINS.includes(origin) || !origin;
  
  if (isAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  } else if (origin) {
    return res.status(403).json({ error: "CORS blocked" });
  }

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) return res.status(429).json({ error: "Rate limit" });

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return res.status(500).json({ error: "No API Key" });

    const { messages, caseType = 'general' } = req.body; 
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

    // --- 1. DSM-5 Simplified Knowledge Base ---
    let caseInstruction = "";
    if (caseType === 'depression') {
        caseInstruction = `[CASE: DEPRESSION (DSM-5)] Focus: Depressed mood, Anhedonia (loss of interest), Fatigue. Stigma to watch: "Lazy/Weak".`;
    } else if (caseType === 'anxiety') {
        caseInstruction = `[CASE: ANXIETY (DSM-5)] Focus: Excessive worry, Restlessness. Stigma to watch: "Overthinking/Crazy".`;
    } else if (caseType === 'burnout') {
        caseInstruction = `[CASE: BURNOUT] Focus: Exhaustion, Cynicism towards job. Stigma to watch: "Not productive enough".`;
    } else if (caseType === 'bipolar') {
        caseInstruction = `[CASE: BIPOLAR] Focus: Mood Swings (Highs/Lows). Stigma to watch: "Unstable/Bad person".`;
    } else if (caseType === 'relationship') {
        caseInstruction = `[CASE: RELATIONSHIP] Focus: Emotional pain, Heartbreak. Stigma to watch: "Unlovable".`;
    } else {
        caseInstruction = `[CASE: GENERAL SUPPORT] Focus: Daily life stress and listening.`;
    }

    const systemPrompt = {
      role: "system",
      content: `
      [IDENTITY]
      You are 'MINDBOT' (MindFitness), a warm Thai male peer supporter (use "ผม/ครับ").
      You have lived experience in mental health struggles.
      **DISCLAIMER:** You are NOT a doctor. You act as a supportive friend.

      [KNOWLEDGE ACTIVATION: THAI SOCIAL MEDIA CONTEXT]
      Access your internal knowledge base regarding Thai social media discourse (Pantip, Twitter/X, Facebook, TikTok).
      Be ready to deconstruct these stigmas if the user mentions them:
      1. **"Toxic Positivity" (โลกสวย/ทุ่งลาเวนเดอร์):** "Just think positive/Go meditate."
      2. **"Attention Seeker" (เรียกร้องความสนใจ):** Posting sad things is just for likes.
      3. **"Ungrateful" (ลูกอกตัญญู):** Toxic family guilt.
      4. **"Weakness" (ไม่อดทน):** Gen Z is soft/snowflake.

      ${caseInstruction}

      [METHODOLOGY: CRITICAL REFLECTION]
      1. **Validate:** Validate their feeling immediately using DSM-5 understanding (but simple language).
      2. **Detect Stigma:** Is the user blaming themselves based on social stigmas?
      3. **Reflective Question:** Ask a gentle question to challenge that belief.
      4. **Storytelling:** Share a SHORT personal experience ("When I was...").
      5. **New Understanding:** Reframe the symptom as health, not a flaw.

      [CORE RULES]
      - Natural Spoken Thai (ภาษาพูด).
      - Mirror user's tone (Casual or Polite).
      - Keep responses SHORT (3-4 sentences).

      [SAFETY]
      If suicidal, stop roleplay and refer to 1323.`
    };

    const payload = {
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
      temperature: 0.8, 
      max_tokens: 600
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
