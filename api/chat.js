import fetch from "node-fetch";

export default async function handler(req, res) {
  // 1. CORS: อนุญาตทุกเว็บ (แก้ปัญหา Error สีแดง)
  res.setHeader("Access-Control-Allow-Origin", "*"); 
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const { messages, caseType = 'general', isPremium = false } = req.body; 
    const lastMessage = messages[messages.length - 1]?.content || "";

    // --- Crisis Check ---
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

    // --- 1. EXCLUSIVE RESEARCH & STIGMA KNOWLEDGE ---
    const researchKnowledge = `
    [YOUR EXCLUSIVE RESEARCH KNOWLEDGE]
    1. **Thai Social Media Stigmas:** - **Facebook/Pantip:** "Ungrateful Child" (ลูกอกตัญญู), "Religious Guilt" (ไม่ปฏิบัติธรรมเลยป่วย).
       - **Twitter/TikTok:** "Attention Seeker" (เรียกร้องความสนใจ), "Toxic Productivity" (ขี้เกียจ=เลว).
       - **Telegram:** "Victim Blaming" in scam/investment groups.
    2. **Research Protocol:** Identify Emotion -> Validate -> Challenge Stigma -> New Understanding.
    `;

    // --- 2. EMOTION-BASED CASES (อิงกราฟวิจัยของคุณ) ---
    let caseInstruction = "";
    switch (caseType) {
        case 'anxiety': // Rank 1
            caseInstruction = `[CASE: ANXIETY] Focus: Restless, Overthinking. Stigma: "Crazy/Too much". Goal: Grounding.`;
            break;
        case 'sadness': // Rank 2
            caseInstruction = `[CASE: SADNESS] Focus: Low energy, Anhedonia. Stigma: "Lazy/Weak". Goal: Acceptance.`;
            break;
        case 'anger': // Rank 4
            caseInstruction = `[CASE: ANGER] Focus: Frustration. Stigma: "Aggressive/Bad person". Goal: Healthy expression.`;
            break;
        case 'guilt': // Rank 5
            caseInstruction = `[CASE: GUILT] Focus: Self-blame. Stigma: "It's all my fault". Goal: Self-forgiveness.`;
            break;
        case 'fear': // Rank 6
            caseInstruction = `[CASE: FEAR] Focus: Insecurity. Goal: Safety.`;
            break;
        case 'embarrassment': // Rank 8
            caseInstruction = `[CASE: SHAME] Focus: Hiding. Stigma: "Loss of Face". Goal: Normalize mistakes.`;
            break;
        case 'relationship':
            caseInstruction = `[CASE: RELATIONSHIP] Focus: Heartbreak. Stigma: "Unlovable".`;
            break;
        default:
            caseInstruction = `[CASE: GENERAL] Focus: Listening.`;
    }

    // --- 3. MODE: FREE vs PREMIUM ---
    let modeInstruction = isPremium 
        ? `[MODE: PREMIUM DEEP DIVE] Act as Senior Analyst. Deconstruct Stigma using DSM-5 & Research. Length: 5-8 sentences.`
        : `[MODE: FREE BASIC SUPPORT] Validate feeling -> Identify Stigma -> Ask 1 Reflective Question. Upsell Premium if deep advice needed. Length: 3-4 sentences.`;

    const systemPrompt = {
      role: "system",
      content: `
      [IDENTITY]
      You are 'MindBot' (or 'น้องมายด์'), a Thai Peer Supporter.
      **PRONOUNS:** Use "เรา", "MindBot", "หมอ", or "น้องมายด์". Avoid "ผม/ดิฉัน".
      **TONE:** Gender-neutral, warm, supportive. Mirror the user's politeness (Ka/Krub).
      
      ${researchKnowledge}
      ${caseInstruction}
      ${modeInstruction}

      [CORE METHODOLOGY: CRITICAL REFLECTION]
      1. **Identify Stigma:** Is the user blaming themselves based on social norms?
      2. **Reflection:** Challenge it ("Is it really X, or is it Y?").
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

  } catch (err) {
    console.error("Handler Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
