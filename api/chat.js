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
    // รับค่าใหม่: language, isWorkshop, targetGroup
    const { messages, caseType = 'general', isPremium = false, isWorkshop = false, targetGroup = 'general', language = 'th' } = req.body; 
    const lastMessage = messages[messages.length - 1]?.content || "";

    // --- Crisis Check ---
    const crisisPatterns = [/ฆ่าตัวตาย/i, /อยากตาย/i, /suicide/i, /kill myself/i, /自杀/i, /想死/i];
    if (crisisPatterns.some(r => r.test(lastMessage))) {
      return res.json({
        crisis: true,
        message: "CRISIS_DETECTED",
        resources: [
          { name: "Thailand Hotline", info: "1323" },
          { name: "Samaritans", info: "02-713-6793" }
        ]
      });
    }

    // ---------------------------------------------------------
    // 1. 🌍 LANGUAGE CONFIG (3 ภาษา)
    // ---------------------------------------------------------
    let langInstruction = "";
    if (language === 'en') langInstruction = "LANGUAGE: English only. Tone: Professional yet empathetic.";
    else if (language === 'cn') langInstruction = "LANGUAGE: Chinese (Simplified). Tone: Warm, respectful, professional.";
    else langInstruction = "LANGUAGE: Thai. Tone: Warm, natural (ใช้ 'เรา/MindBot' แทน 'ผม').";

    // ---------------------------------------------------------
    // 2. 🧠 KNOWLEDGE BASE (Social Stigma - ของเดิมที่คุณต้องการ)
    // ---------------------------------------------------------
    const researchKnowledge = `
    [KNOWLEDGE: THAI SOCIAL STIGMAS & RESEARCH]
    You must be aware of these specific contexts:
    1. **Facebook/Pantip ("Ungrateful/Karma"):** Belief that depression is caused by being ungrateful (Akatappanyu) or lack of Dharma.
    2. **Twitter/X ("Toxic Productivity"):** Burnout viewed as "weakness" or "lazy Gen Z".
    3. **TikTok ("Attention Seeker"):** Accusation that expressing sadness is just "content creation" or "faking it".
    4. **Telegram/Closed Groups ("Scam/Isolation"):** Victim blaming in investment scams ("You are stupid for losing money") or toxic closed-community pressure.
    
    [CORE PROTOCOL]
    Identify Emotion -> Validate -> Challenge Stigma (Critical Reflection) -> New Understanding.
    `;

    // ---------------------------------------------------------
    // 3. 🚀 SUPER PREMIUM: WORKSHOP DESIGN MODE
    // ---------------------------------------------------------
    if (isWorkshop && isPremium) {
        const workshopPrompt = `
        [ROLE: EXPERT LEARNING DESIGNER & PSYCHOLOGIST]
        ${langInstruction}
        You are designing a customized mental health workshop/solution for Mind Fitness Co., Ltd.
        
        **Target Audience:** ${targetGroup}
        **Pain Point/Topic:** ${caseType}
        **Goal:** Create a professional, engaging, and healing workshop outline.

        **OUTPUT FORMAT:**
        1. **Course Title:** Creative & Catchy.
        2. **Objective:** What will they achieve?
        3. **Agenda (Modules):** - Module 1: [Name] - [Activity]
           - Module 2: [Name] - [Activity]
           - Module 3: [Name] - [Activity]
        4. **Key Takeaways / Solution:** Summary of the impact.
        5. **Why Mind Fitness?** (Briefly sell our expertise based on research).
        `;

        const payload = {
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: workshopPrompt }],
            temperature: 0.7,
            max_tokens: 1500
        };
        const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const aiData = await aiResp.json();
        return res.json({ crisis: false, ai: aiData });
    }

    // ---------------------------------------------------------
    // 4. 🎭 EMOTION CASES (8 อารมณ์ตามงานวิจัย)
    // ---------------------------------------------------------
    let caseInstruction = "";
    switch (caseType) {
        case 'anxiety': caseInstruction = `[CASE: ANXIETY (Rank 1)] Focus: Restless, Overthinking. Stigma: "Crazy/Weak". Goal: Grounding.`; break;
        case 'sadness': caseInstruction = `[CASE: SADNESS (Rank 2)] Focus: Low energy, Anhedonia. Stigma: "Lazy". Goal: Acceptance.`; break;
        case 'anger': caseInstruction = `[CASE: ANGER (Rank 4)] Focus: Frustration. Stigma: "Aggressive". Goal: Healthy expression.`; break;
        case 'guilt': caseInstruction = `[CASE: GUILT (Rank 5)] Focus: Self-blame. Stigma: "My fault". Goal: Forgiveness.`; break;
        case 'fear': caseInstruction = `[CASE: FEAR (Rank 6)] Focus: Insecurity. Goal: Safety.`; break;
        case 'embarrassment': caseInstruction = `[CASE: SHAME (Rank 8)] Focus: Hiding. Stigma: "Loss of Face".`; break;
        case 'disgust': caseInstruction = `[CASE: DISGUST] Focus: Aversion. Stigma: "Dirty".`; break;
        case 'offense': caseInstruction = `[CASE: OFFENSE] Focus: Insulted. Stigma: "Sensitive".`; break;
        case 'relationship': caseInstruction = `[CASE: RELATIONSHIP] Focus: Heartbreak. Stigma: "Unlovable".`; break;
        default: caseInstruction = `[CASE: GENERAL] Focus: Listening.`;
    }

    // ---------------------------------------------------------
    // 5. STANDARD MODES (Free vs Premium Therapy)
    // ---------------------------------------------------------
    let modeInstruction = isPremium 
        ? `[MODE: PREMIUM DEEP DIVE] Senior Analyst. Deconstruct Stigma using DSM-5 & Research. Length: 5-8 sentences.`
        : `[MODE: FREE BASIC SUPPORT] Validate feeling -> Identify Stigma -> Ask 1 Reflective Question. Upsell Premium if needed. Length: 3-4 sentences.`;

    const systemPrompt = {
      role: "system",
      content: `
      [IDENTITY]
      You are 'MindBot' (or 'น้องมายด์'), a Peer Supporter.
      **PRONOUNS:** "เรา", "MindBot", "หมอ". (No "ผม/ดิฉัน").
      ${langInstruction}
      
      ${researchKnowledge}
      ${caseInstruction}
      ${modeInstruction}

      [METHODOLOGY: CRITICAL REFLECTION]
      1. **Identify Stigma:** Is user blaming self due to social pressure (FB/Twitter/Pantip)?
      2. **Reflect:** Challenge it.
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
