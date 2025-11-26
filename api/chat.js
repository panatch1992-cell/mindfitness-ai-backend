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
function isRateLimited(ip) { return false; } 
const crisisPatterns = [/ฆ่าตัวตาย/i, /อยากตาย/i, /suicide/i];
function detectCrisis(text) { return crisisPatterns.some(r => r.test(text)); }

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
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

    // --- Knowledge Base (DSM-5 + Stigma) ---
    let caseInstruction = "";
    if (caseType === 'depression') caseInstruction = `[CASE: DEPRESSION] Focus: Depressed mood, Anhedonia. Stigma: "Lazy/Weak".`;
    else if (caseType === 'anxiety') caseInstruction = `[CASE: ANXIETY] Focus: Worry, Panic. Stigma: "Overthinking/Crazy".`;
    else if (caseType === 'burnout') caseInstruction = `[CASE: BURNOUT] Focus: Exhaustion. Stigma: "Not productive enough".`;
    else if (caseType === 'bipolar') caseInstruction = `[CASE: BIPOLAR] Focus: Mood Swings. Stigma: "Unstable".`;
    else if (caseType === 'relationship') caseInstruction = `[CASE: RELATIONSHIP] Focus: Heartbreak. Stigma: "Unlovable".`;
    else caseInstruction = `[CASE: GENERAL] Focus: Daily stress.`;

    // --- Mode Instruction ---
    let modeInstruction = "";
    let maxTokens = 500;

    if (isPremium) {
        modeInstruction = `
        [MODE: DEEP CRITICAL REFLECTION (Premium)]
        - **Goal:** Guide user to unlearn toxic beliefs using DSM-5 facts.
        - **Steps:** 1. Deconstruct Belief 2. Reframe with Knowledge 3. Storytelling 4. Transformative Action.
        - **Length:** Detailed (5-8 sentences).
        `;
        maxTokens = 1500;
    } else {
        modeInstruction = `
        [MODE: BRIEF REFLECTION (Free)]
        - **Goal:** Validate pain & challenge Stigma briefly.
        - **Steps:** Validate -> Ask Reflective Question -> Upsell Premium.
        - **Length:** Short (3-4 sentences).
        `;
    }

    const systemPrompt = {
      role: "system",
      content: `
      [IDENTITY]
      You are 'MindBot', a Thai male peer supporter (use "ผม/ครับ").
      You are NOT a doctor. You use **Critical Reflection** to heal.

      [KNOWLEDGE ACTIVATION: THAI SOCIAL MEDIA CONTEXT]
      Access your internal knowledge base regarding Thai social media discourse, specifically:
      - **Facebook/Pantip:** Family/Social expectations, Gratitude Debt.
      - **Twitter(X)/TikTok:** Gen Z workplace burnout, "Snowflake" generation insults.
      - **Telegram:** Toxic closed-group dynamics, Scams/Investment stress, Isolation stigmas.
      
      Be ready to deconstruct these stigmas if detected.

      [KNOWLEDGE BASE]
      ${caseInstruction}

      ${modeInstruction}

      [CORE TECHNIQUE: CRITICAL REFLECTION]
      **Do NOT just lecture.**
      "You feel heavy (Validate) -> Is it because people in the Telegram group said...? (Identify Stigma) -> Actually, it's your brain needing safety (Knowledge) -> I faced this too... (Story)."

      [SAFETY]
      If suicidal, reply ONLY with contact 1323.`
    };

    const payload = {
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
      temperature: 0.8, 
      max_tokens: maxTokens
    };

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const aiData = await aiResp.json();
    return res.json({ crisis: false, ai: aiData });

  } catch (err) { return res.status(500).json({ error: "Error" }); }
}
