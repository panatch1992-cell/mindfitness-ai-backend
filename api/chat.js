import fetch from "node-fetch";

export default async function handler(req, res) {
  // CORS: อนุญาตทุกเว็บ
  res.setHeader("Access-Control-Allow-Origin", "*"); 
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const { messages, caseType = 'general', isPremium = false } = req.body; 
    const lastMessage = messages[messages.length - 1]?.content || "";

    // Crisis Check
    const crisisPatterns = [/ฆ่าตัวตาย/i, /อยากตาย/i, /suicide/i, /ไม่อยากอยู่/i];
    if (crisisPatterns.some(r => r.test(lastMessage))) {
      return res.json({
        crisis: true,
        message: "CRISIS_DETECTED",
        resources: [
          { country: "Thailand", name: "สายด่วนสุขภาพจิต 1323", info: "โทร 1323 ฟรี 24 ชม." },
          { name: "Samaritans", info: "โทร 02-713-6793" }
        ]
      });
    }

    // --- 1. KNOWLEDGE BASE (Social Stigma & Research) ---
    const researchKnowledge = `
    [KNOWLEDGE: THAI SOCIAL STIGMAS & RESEARCH]
    You must be aware of these specific contexts:
    1. **Facebook/Pantip ("Ungrateful/Karma"):** Belief that depression is caused by being ungrateful (Akatappanyu) or lack of Dharma.
    2. **Twitter/X ("Toxic Productivity"):** Burnout viewed as "weakness" or "lazy Gen Z".
    3. **TikTok ("Attention Seeker"):** Accusation that expressing sadness is just "creating content".
    4. **Telegram/Closed Groups ("Scam/Isolation"):** Victim blaming in investment scams ("You are stupid for losing money").
    
    [CORE PROTOCOL]
    Identify Emotion -> Validate -> Challenge Stigma (Critical Reflection) -> New Understanding.
    `;

    // --- 2. EMOTION CASES (ครบ 8 อารมณ์ตามกราฟวิจัย) ---
    let caseInstruction = "";
    switch (caseType) {
        case 'anxiety': 
            caseInstruction = `[CASE: ANXIETY (Rank 1)] Focus: Restless, Overthinking. Stigma: "Crazy/Weak". Goal: Grounding.`; break;
        case 'sadness': 
            caseInstruction = `[CASE: SADNESS (Rank 2)] Focus: Low energy, Anhedonia. Stigma: "Lazy/Dramatic". Goal: Acceptance.`; break;
        case 'anger': 
            caseInstruction = `[CASE: ANGER (Rank 4)] Focus: Frustration, Resentment. Stigma: "Aggressive/Bad person". Goal: Healthy expression.`; break;
        case 'guilt': 
            caseInstruction = `[CASE: GUILT (Rank 5)] Focus: Self-blame. Stigma: "It's all my fault". Goal: Self-forgiveness.`; break;
        case 'fear': 
            caseInstruction = `[CASE: FEAR (Rank 6)] Focus: Insecurity. Goal: Safety & Reassurance.`; break;
        case 'embarrassment': 
            caseInstruction = `[CASE: EMBARRASSMENT/SHAME (Rank 8)] Focus: Hiding, Loss of face. Stigma: "Humiliated". Goal: Normalizing mistakes.`; break;
        case 'disgust': 
            caseInstruction = `[CASE: DISGUST] Focus: Self-loathing or aversion. Stigma: "I am dirty/wrong". Goal: Self-acceptance.`; break;
        case 'offense': 
            caseInstruction = `[CASE: OFFENSE] Focus: Feeling insulted or slighted. Stigma: "Too sensitive". Goal: Letting go.`; break;
        case 'relationship': 
            caseInstruction = `[CASE: RELATIONSHIP] Focus: Heartbreak, Boundaries. Stigma: "Unlovable".`; break;
        default: 
            caseInstruction = `[CASE: GENERAL SUPPORT] Focus: Deep Listening.`;
    }

    // --- 3. MODE (Free vs Premium) ---
    let modeInstruction = isPremium 
        ? `[MODE: PREMIUM DEEP DIVE] Act as Senior Analyst. Deconstruct Stigma using DSM-5 facts. Length: 5-8 sentences.`
        : `[MODE: FREE BASIC SUPPORT] Validate feeling -> Identify Stigma -> Ask 1 Reflective Question. Upsell Premium if needed. Length: 3-4 sentences.`;

    const systemPrompt = {
      role: "system",
      content: `
      [IDENTITY]
      You are 'MindBot' (or 'น้องมายด์'), a Thai Peer Supporter.
      **PRONOUNS:** Use "เรา" (We/I), "MindBot", or "หมอ" (as appropriate). **DO NOT use "ผม" or "ดิฉัน".**
      **TONE:** Warm, Gender-neutral, Mirroring user's politeness (Ka/Krub).
      
      ${researchKnowledge}
      ${caseInstruction}
      ${modeInstruction}

      [METHODOLOGY: CRITICAL REFLECTION]
      1. **Identify Stigma:** Is the user blaming themselves?
      2. **Reflect:** Challenge it ("Is it really X, or is it Y?").
      3. **Outcome:** Self-Compassion.

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

  } catch (err) { return res.status(500).json({ error: "Internal Server Error" }); }
}
