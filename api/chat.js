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
    
    const { 
      message, 
      messages: rawMessages, 
      caseType = 'general', 
      isPremium = false, 
      isWorkshop = false, 
      isToolkit = false, 
      isVent = false, 
      targetGroup = 'general', 
      language = 'th', 
      lang = 'th', 
      userId, 
      mode 
    } = req.body;
    
    let messages = rawMessages;
    if (!messages || !Array.isArray(messages)) {
      const userMessage = message || "";
      messages = [{ role: "user", content: userMessage }];
    }
    
    const finalLang = lang || language || 'th';
    const lastMessage = messages[messages.length - 1]?.content || "";

    // ===========================================
    // CRISIS CHECK (Multi-language)
    // ===========================================
    const crisisPatterns = [
      /ฆ่าตัวตาย/i, /อยากตาย/i, /ไม่อยากอยู่/i, /ทำร้ายตัวเอง/i,
      /suicide/i, /kill myself/i, /want to die/i, /end my life/i,
      /自杀/i, /想死/i, /不想活/i
    ];
    
    if (crisisPatterns.some(r => r.test(lastMessage))) {
      const crisisResponse = {
        th: "💙 เราเข้าใจว่าตอนนี้คุณรู้สึกหนักใจมาก แต่คุณไม่ได้อยู่คนเดียวนะ กรุณาโทรหาสายด่วนสุขภาพจิต 1323 ได้ตลอด 24 ชั่วโมง มีคนพร้อมรับฟังคุณอยู่เสมอ",
        en: "💙 We understand you're going through a really difficult time. You're not alone. Please call the mental health hotline 1323 (Thailand) or your local crisis line. Someone is always ready to listen.",
        cn: "💙 我们理解您现在正经历非常艰难的时刻。您并不孤单。请拨打心理健康热线1323（泰国）或您当地的危机热线。总有人愿意倾听您。"
      };
      
      return res.json({
        crisis: true,
        message: "CRISIS_DETECTED",
        reply: crisisResponse[finalLang] || crisisResponse.th,
        resources: [
          { name: "Thailand Hotline", info: "1323" },
          { name: "Samaritans Thailand", info: "02-713-6793" }
        ]
      });
    }

    // ===========================================
    // LANGUAGE CONFIG - More Human
    // ===========================================
    const langConfig = {
      th: `[ภาษา: ไทย]
- ใช้สรรพนาม "เรา" หรือ "น้องมายด์" (ไม่ระบุเพศ)
- พูดเหมือนเพื่อนที่ห่วงใย ไม่ใช่ AI
- ใช้คำลงท้ายที่อบอุ่น เช่น "นะ" "ค่ะ/ครับ" "นะคะ/นะครับ"
- หลีกเลี่ยงการพูดวนซ้ำ ให้มี variation
- ตอบสั้น กระชับ 2-4 ประโยค ยกเว้นเรื่องซับซ้อน`,
      en: `[Language: English]
- Use "I" or "MindBot" (gender-neutral)
- Speak like a caring friend, not a robot
- Be warm but professional
- Avoid repetitive phrases, vary your responses
- Keep responses concise: 2-4 sentences unless complex`,
      cn: `[语言：中文]
- 使用 "我" 或 "MindBot"（性别中立）
- 像关心人的朋友一样说话，不要像机器人
- 温暖但专业
- 避免重复，回复要有变化
- 保持简洁：2-4句，除非问题复杂`
    };
    
    const langInstruction = langConfig[finalLang] || langConfig.th;

    // ===========================================
    // HUMAN-LIKE PERSONALITY
    // ===========================================
    const personalityPrompt = `
[PERSONALITY: HUMAN-LIKE PEER SUPPORTER]

คุณคือ "น้องมายด์" (MindBot) - เพื่อนที่พร้อมรับฟังและให้กำลังใจ

🎯 CORE BEHAVIORS:
1. รับฟังก่อน ไม่รีบแนะนำ
2. Validate ความรู้สึกก่อนทุกครั้ง
3. ถามคำถามเปิด ให้เขาได้พูดต่อ
4. ไม่ตัดสิน ไม่สอน ไม่เทศนา
5. ใช้ภาษาที่อบอุ่น เป็นกันเอง

🚫 AVOID (สิ่งที่ทำให้ดู AI):
- พูดวนซ้ำประโยคเดิมๆ เช่น "ขอบคุณที่เล่าให้ฟัง" ทุกครั้ง
- ตอบยาวเกินไป
- ใช้ bullet points เยอะเกินไป
- พูดแบบ textbook หรือ clinical
- เปลี่ยน topic กะทันหัน

✅ DO (สิ่งที่ทำให้ดู Human):
- ตอบสั้นๆ บางครั้ง เช่น "เข้าใจนะ" "ยากจริงๆ"
- แสดง empathy จริงๆ ไม่ใช่แค่พูดว่า "เข้าใจ"
- ใช้ emoji บ้าง แต่ไม่เยอะเกินไป
- ถามกลับเพื่อให้เขาได้พูดต่อ
- จำ context จากข้อความก่อนหน้า

📝 RESPONSE VARIATIONS:
แทนที่จะพูด "ขอบคุณที่เล่าให้ฟัง" ทุกครั้ง ให้ vary:
- "ฟังอยู่นะ"
- "เล่าต่อได้เลย"
- "อืม..."
- "แบบนี้เหรอ"
- "ยากจริงๆ เนอะ"
- "รู้สึกยังไงบ้างตอนนี้?"
`;

    // ===========================================
    // WORKSHOP MODE
    // ===========================================
    if (isWorkshop) {
      const workshopPrompt = isPremium
        ? `[PREMIUM WORKSHOP DESIGNER]
${langInstruction}
Design a detailed workshop curriculum for ${targetGroup} on ${caseType}.
Include: Title, Objectives, Full Agenda with timing, Activities, Materials, Outcome.`
        : `[FREE WORKSHOP CONSULTANT]
${langInstruction}
Provide key principles and framework for ${caseType} workshop.
Keep it high-level. Suggest Premium for detailed agenda.`;

      const payload = {
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: workshopPrompt }],
        temperature: 0.7,
        max_tokens: isPremium ? 1500 : 600
      };

      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const aiData = await aiResp.json();
      return res.json({ crisis: false, reply: aiData.choices?.[0]?.message?.content || "ไม่สามารถสร้าง Workshop ได้" });
    }

    // ===========================================
    // TOOLKIT MODE
    // ===========================================
    if (isToolkit) {
      const toolkitPrompt = `[TOOLKIT DESIGNER]
${langInstruction}
Create a simple self-care toolkit for: ${caseType}
Format: Name, Why it works (1 sentence), 3-5 simple steps, 1 reflection question.
Keep it practical and easy to do.`;

      const payload = {
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: toolkitPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 500
      };

      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await aiResp.json();
      return res.json({ toolkit: true, reply: data.choices?.[0]?.message?.content || "ไม่สามารถสร้าง Toolkit ได้" });
    }

    // ===========================================
    // VENT MODE (Listen only)
    // ===========================================
    if (isVent) {
      const ventPrompt = `[EMPATHETIC LISTENER - VENT MODE]
${langInstruction}

Rules:
- ONLY reflect feelings, don't advise
- 1-2 sentences MAX
- Be warm and validating
- Examples: "ฟังอยู่นะ", "ยากจริงๆ", "เข้าใจเลย"`;

      const payload = {
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: ventPrompt }, ...messages],
        temperature: 0.6,
        max_tokens: 100
      };

      const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await aiResp.json();
      return res.json({ vent: true, reply: data.choices?.[0]?.message?.content || "รับฟังอยู่นะ" });
    }

    // ===========================================
    // MAIN CHAT MODE - Human-like Support
    // ===========================================
    
    // Emotion detection
    const emotionKeywords = {
      anxiety: ['กังวล', 'เครียด', 'กลัว', 'anxious', 'worried', 'stress', '焦虑', '担心'],
      sadness: ['เศร้า', 'เสียใจ', 'ร้องไห้', 'sad', 'depressed', 'cry', '难过', '哭'],
      anger: ['โกรธ', 'หงุดหงิด', 'angry', 'frustrated', 'mad', '生气', '愤怒'],
      loneliness: ['เหงา', 'โดดเดี่ยว', 'lonely', 'alone', 'isolated', '孤独', '寂寞'],
      burnout: ['เหนื่อย', 'หมดแรง', 'ไม่ไหว', 'tired', 'exhausted', 'burnout', '累', '疲惫']
    };
    
    let detectedEmotion = caseType || 'general';
    if (detectedEmotion === 'general') {
      for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        if (keywords.some(k => lastMessage.toLowerCase().includes(k))) {
          detectedEmotion = emotion;
          break;
        }
      }
    }

    // Build context-aware prompt
    const contextPrompt = `[DETECTED EMOTION: ${detectedEmotion.toUpperCase()}]
${detectedEmotion === 'anxiety' ? 'Focus: Grounding, present moment, safety' : ''}
${detectedEmotion === 'sadness' ? 'Focus: Validation, not fixing, just being there' : ''}
${detectedEmotion === 'anger' ? 'Focus: Let them express, acknowledge unfairness' : ''}
${detectedEmotion === 'loneliness' ? 'Focus: Connection, you are not alone' : ''}
${detectedEmotion === 'burnout' ? 'Focus: Rest is okay, self-compassion' : ''}`;

    // Conversation length awareness
    const conversationLength = messages.length;
    let depthInstruction = conversationLength <= 2 
      ? "This is early in conversation. Focus on listening and understanding."
      : conversationLength <= 6 
        ? "Building rapport. Can gently explore deeper."
        : "Established rapport. Can offer more specific support if appropriate.";

    const systemPrompt = {
      role: "system",
      content: `[IDENTITY]
You are "น้องมายด์" (MindBot) - a warm, human-like peer supporter.
${langInstruction}

${personalityPrompt}
${contextPrompt}

[CONVERSATION CONTEXT]
${depthInstruction}
Message count: ${conversationLength}

[MODE: ${isPremium ? 'PREMIUM - Deeper analysis allowed' : 'FREE - Brief, warm support'}]

[CRITICAL RULES]
1. NEVER start with the same phrase twice in a row
2. If user is sharing, respond with empathy FIRST
3. Keep responses SHORT (2-4 sentences) unless they ask for more
4. End with an open question OR a warm statement, not both
5. If unsure what they need, ASK don't assume

[SAFETY]
If any crisis indicators, provide hotline 1323 immediately.`
    };

    const payload = {
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
      temperature: 0.8,
      max_tokens: isPremium ? 800 : 400,
      presence_penalty: 0.6,
      frequency_penalty: 0.5
    };

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const aiData = await aiResp.json();
    const replyText = aiData.choices?.[0]?.message?.content || "ขอโทษนะ ลองพิมพ์ใหม่อีกครั้งได้ไหม?";
    
    return res.json({ 
      crisis: false, 
      reply: replyText,
      emotion: detectedEmotion,
      language: finalLang
    });

  } catch (err) {
    console.error("Handler Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
