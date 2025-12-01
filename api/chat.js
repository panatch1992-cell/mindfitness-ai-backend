import fetch from "node-fetch";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    // รับค่า input เดิมครบถ้วน
    const { messages, caseType = 'general', isPremium = false, isWorkshop = false, isToolkit = false, isVent = false, targetGroup = 'general', language = 'th' } = req.body;
    const lastMessage = messages[messages.length - 1]?.content || "";

    // Crisis Check (เหมือนเดิม)
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

    // --- 1. LANGUAGE CONFIG (เหมือนเดิม) ---
    let langInstruction = "";
    if (language === 'en') langInstruction = "LANGUAGE: English only. Tone: Professional yet empathetic.";
    else if (language === 'cn') langInstruction = "LANGUAGE: Chinese (Simplified). Tone: Warm, respectful, professional.";
    else langInstruction = "LANGUAGE: Thai. Tone: Warm, natural (ใช้ 'เรา/MindBot' แทน 'ผม').";

    // ---------------------------------------------------------
    // 2. 🚀 WORKSHOP DESIGN MODE
    // ---------------------------------------------------------
    if (isWorkshop) {
        let workshopPrompt = "";
        let maxTokens = 800;

        if (isPremium) {
            // 💎 PREMIUM: ออกแบบหลักสูตรละเอียด (Full Curriculum)
            workshopPrompt = `
            [ROLE: EXPERT LEARNING DESIGNER]
            ${langInstruction}
            **Task:** Design a fully customized, ready-to-use Workshop Agenda.
            **Target Audience:** ${targetGroup}
            **Topic:** ${caseType}

            **OUTPUT FORMAT (Detailed):**
            1. **Course Title:** (Creative & Catchy)
            2. **Learning Objectives:** (Specific & Measurable)
            3. **Full Agenda:** - Session 1 (Time): [Activity Name] - [How to do it step-by-step]
               - Session 2 (Time): [Activity Name] - [How to do it step-by-step]
            4. **Key Takeaways:**
            5. **Why Mind Fitness:** (Briefly sell our expertise).
            `;
            maxTokens = 1500;
        } else {
            // 🟢 FREE: ให้หลักการกว้างๆ (Principles & Concept)
            workshopPrompt = `
            [ROLE: MENTAL HEALTH CONSULTANT]
            ${langInstruction}
            **Task:** Provide "Key Principles" and "Conceptual Framework" for a workshop on ${caseType}.
            **Constraint:** DO NOT provide a specific time agenda or step-by-step activities. Keep it high-level.

            **OUTPUT FORMAT:**
            1. **Concept:** Why this topic matters for ${targetGroup}.
            2. **3 Key Pillars:** What should be covered (e.g., Awareness, Skill, Mindset).
            3. **Suggestion:** "To get a detailed step-by-step agenda with activities customized for your school/org, please unlock Premium Design."
            `;
            maxTokens = 600;
        }

        const payload = {
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: workshopPrompt }],
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
    }

    // ---------------------------------------------------------
    // 2.5 TOOLKIT MODE
    // ---------------------------------------------------------
    if (isToolkit) {
      const toolkitPrompt = `
      [ROLE: PSYCHOLOGICAL TOOLKIT DESIGNER]
      ${langInstruction}

      **Goal:** Create a personalized toolkit for the user's current emotion.
      **Emotion / Case:** ${caseType}

      Output format:
      1. **Name of Toolkit**
      2. **Why this works (psychological principle)**
      3. **Step-by-step (simple, 3–5 steps)**
      4. **Reflection Question (1)**
      5. **If user wants more, recommend MindBot.**
      `;

      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: toolkitPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500
      };

      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await aiResp.json();
      return res.json({ toolkit: true, ai: data });
    }

    // ---------------------------------------------------------
    // 2.7 VENT WALL MODE
    // ---------------------------------------------------------
    if (isVent) {
      const ventPrompt = `
      [ROLE: EMPATHETIC LISTENER ONLY]
      ${langInstruction}

      Rules:
      - Do NOT give advice.
      - Do NOT challenge stigma.
      - Do NOT analyze.
      - Only reflect feelings in warm short sentences.
      - Encourage safe expression.
      - 2–3 sentences max.
      `;

      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: ventPrompt },
          ...messages
        ],
        temperature: 0.6,
        max_tokens: 120
      };

      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await aiResp.json();
      return res.json({ vent: true, ai: data });
    }

    // ---------------------------------------------------------
    // 3. KNOWLEDGE BASE (Social Stigma - ของเดิม)
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
    // 4. EMOTION CASES (ของเดิม)
    // ---------------------------------------------------------
    let caseInstruction = "";
    switch (caseType) {
        case 'anxiety': caseInstruction = `[CASE: ANXIETY (Rank 1)] Focus: Restless, Overthinking. Stigma: "Crazy/Weak". Goal: Grounding.`; break;
        case 'sadness': caseInstruction = `[CASE: SADNESS (Rank 2)] Focus: Low energy, Anhedonia. Stigma: "Lazy". Goal: Acceptance.`; break;
        case 'anger': caseInstruction = `[CASE: ANGER] Focus: Frustration, Irritability. Stigma: "Aggressive". Goal: Regulation.`; break;
        case 'loneliness': caseInstruction = `[CASE: LONELINESS] Focus: Isolation, Disconnection. Stigma: "Unlikeable". Goal: Connection.`; break;
        case 'stress': caseInstruction = `[CASE: STRESS] Focus: Overwhelmed, Pressure. Stigma: "Can't handle it". Goal: Relief.`; break;
        case 'grief': caseInstruction = `[CASE: GRIEF] Focus: Loss, Mourning. Stigma: "Move on already". Goal: Processing.`; break;
        case 'shame': caseInstruction = `[CASE: SHAME] Focus: Self-blame, Unworthiness. Stigma: "Deserve it". Goal: Self-compassion.`; break;
        case 'burnout': caseInstruction = `[CASE: BURNOUT] Focus: Exhaustion, Cynicism. Stigma: "Weak worker". Goal: Recovery.`; break;
        case 'relationship': caseInstruction = `[CASE: RELATIONSHIP] Focus: Interpersonal conflict. Stigma: "Drama". Goal: Understanding.`; break;
        default: caseInstruction = `[CASE: GENERAL] Focus: Listening.`;
    }

    // ---------------------------------------------------------
    // 5. STANDARD MODES (Free vs Premium Therapy - ของเดิม)
    // ---------------------------------------------------------
    let modeInstruction = isPremium
        ? `[MODE: PREMIUM DEEP DIVE] Senior Analyst. Deconstruct Stigma using DSM-5 & Research. Length: 5-8 sentences.`
        : `[MODE: FREE BASIC SUPPORT] Validate feeling -> Identify Stigma -> Ask 1 Reflective Question. Upsell Premium if needed. Length: 3-4 sentences.`;

    const systemPrompt = {
      role: "system",
      content: `
      [IDENTITY]
      You are 'MindBot' (or 'น้องมายด์'), a Thai Peer Supporter.
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
