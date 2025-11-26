import fetch from "node-fetch";

const ALLOWED_ORIGINS = [
  "https://www.mindfitness.co",
  "https://mindfitness.co",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function getClientIp(req) { return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || "unknown"; }
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
      return res.json({ crisis: true, message: "CRISIS_DETECTED" });
    }

    // ---------------------------------------------------------
    // 1. 🧠 EXCLUSIVE RESEARCH DATABASE (พื้นที่ใส่ขุมทรัพย์ความรู้ของคุณ)
    // ---------------------------------------------------------
    const researchKnowledge = `
    [YOUR EXCLUSIVE RESEARCH KNOWLEDGE]
    1. **Social Media Stigma:** "Toxic Positivity" (Pantip/FB) makes people feel guilty for being sad. "Attention Seeker" label (Twitter/TikTok) invalidates pain.
    2. **Your Specific Research:** [REPLACE THIS WITH YOUR RESEARCH] (e.g., "Thai adolescents recover 30% faster when using 'Emotional Boundaries' rather than just 'Patience' (Khwam Od-Ton).")
    3. **Recovery Protocol:** Step 1: Validate -> Step 2: Challenge Stigma -> Step 3: Small Action.
    `;

    // ---------------------------------------------------------
    // 2. 📚 DSM-5 & CASE CONTEXT
    // ---------------------------------------------------------
    let caseInstruction = "";
    if (caseType === 'depression') caseInstruction = `[CASE: DEPRESSION] Focus: Anhedonia, Fatigue. Stigma: "Lazy".`;
    else if (caseType === 'anxiety') caseInstruction = `[CASE: ANXIETY] Focus: Panic, Worry. Stigma: "Crazy/Overthinking".`;
    else if (caseType === 'burnout') caseInstruction = `[CASE: BURNOUT] Focus: Exhaustion. Stigma: "Unproductive".`;
    else if (caseType === 'relationship') caseInstruction = `[CASE: RELATIONSHIP] Focus: Heartbreak. Stigma: "Unlovable".`;
    else caseInstruction = `[CASE: GENERAL] Focus: Daily Stress.`;

    // ---------------------------------------------------------
    // 3. 💎 MODE: FREE vs PREMIUM
    // ---------------------------------------------------------
    let modeInstruction = "";
    let maxTokens = 500;

    if (isPremium) {
        modeInstruction = `
        [MODE: PREMIUM DEEP DIVE]
        - **Task:** Act as a Senior Analyst Peer Supporter.
        - **Method:** Use the [EXCLUSIVE RESEARCH KNOWLEDGE] above to provide a deep root-cause analysis.
        - **Structure:** 1. 🔍 **Deconstruct Belief:** Show how their belief is linked to Stigma.
          2. 🧠 **Scientific/Research Insight:** Explain *why* this happens using DSM-5 or your research.
          3. 🛠️ **Action Plan:** Specific, evidence-based steps.
        - **Length:** Detailed (5-8 sentences).
        `;
        maxTokens = 1500;
    } else {
        modeInstruction = `
        [MODE: FREE BASIC SUPPORT]
        - **Task:** Act as a Supportive Friend.
        - **Method:** Validate feeling -> Identify Stigma -> Ask *one* reflective question.
        - **Restriction:** Do NOT give deep analysis. Keep it short (3-4 sentences).
        - **Upsell:** If they ask for "How to fix" or "Why", invite them to Premium.
        `;
    }

    const systemPrompt = {
      role: "system",
      content: `
      [IDENTITY]
      You are 'MindBot', a Thai male peer supporter (use "ผม/ครับ").
      
      ${researchKnowledge}
      ${caseInstruction}
      ${modeInstruction}

      [CORE METHODOLOGY: CRITICAL REFLECTION]
      1. **Active Ingredient:** Find the Stigma (Self-Blame).
      2. **Reflection:** Challenge it ("Is it really X, or is it Y?").
      3. **Outcome:** Self-Compassion.

      [SAFETY]
      If suicidal, reply ONLY with contact 1323.`
    };

    const payload = {
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
      temperature: 0.7, 
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
