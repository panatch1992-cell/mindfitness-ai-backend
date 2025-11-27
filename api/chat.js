import fetch from "node-fetch";

export default async function handler(req, res) {
  // -----------------------------------------------------------------
  // 1. CORS HEADERS (ส่วนสำคัญที่แก้ปัญหา Error สีแดง)
  // -----------------------------------------------------------------
  // อนุญาตให้ทุกเว็บเรียกใช้ได้ (แก้ปัญหา Access-Control-Allow-Origin หาย)
  res.setHeader("Access-Control-Allow-Origin", "*"); 
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // -----------------------------------------------------------------
  // 2. Handle Preflight Request (ตอบกลับการเคาะประตูถามทาง)
  // -----------------------------------------------------------------
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // -----------------------------------------------------------------
  // 3. Main Logic (ส่วนสมอง AI เดิม)
  // -----------------------------------------------------------------
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return res.status(500).json({ error: "Server missing API Key" });

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

    // --- Knowledge Base & Instructions ---
    const researchKnowledge = `
    [EXCLUSIVE RESEARCH DATABASE]
    1. **Social Stigmas:** "Toxic Positivity" (Facebook), "Attention Seeker" (TikTok), "Ungrateful" (Pantip).
    2. **Protocol:** Identify Stigma -> Reflect -> Reframe.
    `;

    let caseInstruction = "";
    if (caseType === 'depression') caseInstruction = `[CASE: DEPRESSION] Focus: Low energy, Anhedonia. Stigma: Lazy.`;
    else if (caseType === 'anxiety') caseInstruction = `[CASE: ANXIETY] Focus: Panic, Worry. Stigma: Crazy.`;
    else if (caseType === 'burnout') caseInstruction = `[CASE: BURNOUT] Focus: Exhaustion. Stigma: Unproductive.`;
    else if (caseType === 'relationship') caseInstruction = `[CASE: RELATIONSHIP] Focus: Heartbreak. Stigma: Unlovable.`;
    else caseInstruction = `[CASE: GENERAL] Focus: Stress.`;

    let modeInstruction = isPremium 
        ? `[MODE: PREMIUM] Deep Analysis (DSM-5 based). Deconstruct Stigma. Length: 5-8 sentences.`
        : `[MODE: FREE] Listen & Validate. Brief Reflection. Upsell Premium if asked for deep advice. Length: 3-4 sentences.`;

    const systemPrompt = {
      role: "system",
      content: `
      [IDENTITY] You are 'MindBot', a Thai male peer supporter (ผม/ครับ).
      ${researchKnowledge}
      ${caseInstruction}
      ${modeInstruction}
      [METHODOLOGY] Critical Reflection.
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

    if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error("OpenAI Error:", errText);
        throw new Error("OpenAI API Error");
    }

    const aiData = await aiResp.json();
    return res.json({ crisis: false, ai: aiData });

  } catch (err) {
    console.error("Handler Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
