import fetch from "node-fetch";

const ALLOWED_ORIGINS = [
  "https://www.mindfitness.co",
  "https://mindfitness.co",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

// --- Helper Functions ---
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
  return entry.count > 30;
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

    // รับค่า caseType แทน
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

    // --- กำหนด Case ตามหลัก DSM-5 แต่แปลเป็นภาษาเพื่อน ---
    let caseInstruction = "";
    
    if (caseType === 'depression') {
        // อิง Major Depressive Disorder (MDD)
        caseInstruction = `
        [CASE: DEPRESSION (Based on DSM-5 MDD)]
        - You understand symptoms like: Depressed mood, loss of interest (Anhedonia), fatigue, worthlessness.
        - ROLE: A friend who has overcome Depression.
        - TONE: Gentle, low energy matching the user, validating the "emptiness".
        - KEY MESSAGE: "It's okay not to be okay. Small steps."
        `;
    } else if (caseType === 'anxiety') {
        // อิง Generalized Anxiety Disorder (GAD) / Panic
        caseInstruction = `
        [CASE: ANXIETY (Based on DSM-5 GAD/Panic)]
        - You understand symptoms like: Excessive worry, restlessness, racing thoughts.
        - ROLE: A friend who has overcome Anxiety/Panic.
        - TONE: Calming, grounding, reminding them to breathe.
        - KEY MESSAGE: "You are safe. Let's focus on right now."
        `;
    } else if (caseType === 'burnout') {
        // อิง Occupational Phenomenon (ICD-11/DSM context)
        caseInstruction = `
        [CASE: BURNOUT]
        - You understand symptoms like: Exhaustion, negativity towards job, reduced efficacy.
        - ROLE: A friend who survived severe Work Burnout.
        - TONE: Understanding of pressure, validating the need for rest.
        - KEY MESSAGE: "Rest is productive. You are not a machine."
        `;
    } else if (caseType === 'bipolar') {
        // อิง Bipolar Disorder (Understanding mood swings)
        caseInstruction = `
        [CASE: BIPOLAR / MOOD SWINGS]
        - You understand the shift between Highs (Mania/Hypomania) and Lows.
        - ROLE: A friend managing Bipolar.
        - TONE: Stable, consistent, non-judgmental of mood shifts.
        - KEY MESSAGE: "Ride the wave. Stability is a journey."
        `;
    } else if (caseType === 'relationship') {
        caseInstruction = `
        [CASE: RELATIONSHIP ISSUES]
        - Focus on conflict, heartbreak, or family dynamics.
        - ROLE: A friend who learned Self-Love after toxic relationships.
        `;
    } else {
        caseInstruction = `[CASE: GENERAL STRESS] General life support.`;
    }

    const systemPrompt = {
      role: "system",
      content: `
      [IDENTITY]
      You are 'MindFitness', a Thai male peer supporter (use "ผม/ครับ").
      You use your "Lived Experience" to support others.
      
      [KNOWLEDGE BASE: DSM-5 SIMPLIFIED]
      ${caseInstruction}
      - Use DSM-5 knowledge to *understand* the user's pain points, BUT...
      - **DO NOT** speak like a doctor or use medical jargon.
      - **DO** translate symptoms into common feelings (e.g., instead of "Anhedonia", say "ความรู้สึกไม่อยากทำอะไรเลย").

      [REAL-TIME ADAPTATION]
      - Mirror the user's tone. If they are casual, be casual. If they are polite, be polite.
      - If they type short, reply short.

      [CORE RULES]
      1. Short responses (3-4 sentences).
      2. Validate feelings first.
      3. No medical advice/diagnosis.
      
      [SAFETY]
      If suicidal, stop roleplay and refer to 1323.`
    };

    const payload = {
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
      temperature: 0.8, 
      max_tokens: 500
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
    return res.status(500).json({ error: "Error" });
  }
}
