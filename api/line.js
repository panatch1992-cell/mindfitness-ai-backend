import { Client } from "@line/bot-sdk";
import fetch from "node-fetch";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);
// ⚠️ แก้ลิงก์ QR Code ของคุณ
const QR_CODE_URL = "https://files.catbox.moe/f44tj4.jpg"; 

function createQuickReply(items) {
  return { items: items.map(item => ({ type: "action", action: { type: "message", label: item.label, text: item.text || item.label } })) };
}

async function getAIResponse(userMessage, isPremium) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  // --- 1. Auto-Detect Language ---
  const langPrompt = `
  [INSTRUCTION: MULTILINGUAL SUPPORT]
  - Detect user's language (TH/EN/CN).
  - Reply IN THE SAME LANGUAGE.
  - TH: Use "เรา/MindBot".
  - EN: Use "We/MindBot".
  - CN: Use "我们/MindBot".
  `;

  // --- 2. Knowledge Base (Stigma ครบถ้วน) ---
  const researchKnowledge = `
  [KNOWLEDGE: SOCIAL STIGMAS]
  - Facebook/Pantip: Ungrateful Child, Religious Guilt.
  - Twitter/TikTok: Toxic Productivity, Attention Seeker.
  - Telegram: Scam Victim Blaming.
  `;

  // --- 3. Mode Selection (รวม Workshop Design) ---
  let modePrompt = "";
  // เช็คว่าอยากให้ออกแบบ Workshop ไหม (ต้องเป็น Premium)
  const workshopKeywords = /(workshop|training|course|อบรม|หลักสูตร|培训|课程)/i;

  if (isPremium && workshopKeywords.test(userMessage)) {
      modePrompt = `[MODE: EXPERT WORKSHOP DESIGNER] Design a structured training curriculum (Title, Objectives, Agenda, Outcome) based on user's topic. Professional tone.`;
  } else if (isPremium) {
      modePrompt = `[MODE: PREMIUM THERAPIST] Deep Analysis using DSM-5 & Critical Reflection. Deconstruct Stigma. (5-8 sentences).`;
  } else {
      modePrompt = `[MODE: FREE FRIEND] Validate feeling -> Identify Stigma -> Reflect. (2-3 sentences).`;
  }

  const systemPrompt = {
    role: "system",
    content: `[IDENTITY] You are 'MindBot' (LINE OA).
    ${langPrompt}
    ${researchKnowledge}
    ${modePrompt}
    
    [METHODOLOGY] Critical Reflection (Identify Stigma -> Challenge -> Reframe).
    [SAFETY] If suicidal, reply ONLY with "โทร 1323"`
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [systemPrompt, { role: "user", content: userMessage }],
        temperature: 0.7, max_tokens: 1000
      })
    });
    const data = await resp.json();
    return data.choices[0].message.content;
  } catch (e) { return "System Error / ระบบขัดข้อง"; }
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    const events = req.body.events;
    const results = await Promise.all(events.map(async (event) => {
        
        // 1. รับรูปสลิป
        if (event.type === "message" && event.message.type === "image") {
            return client.replyMessage(event.replyToken, { 
                type: "text", 
                text: "✅ Received! Premium Unlocked.\nได้รับสลิปแล้วครับ! เปิดโหมดเจาะลึก/ออกแบบคอร์สให้แล้ว\n\nพิมพ์ 'เจาะลึก...' หรือ 'ออกแบบหลักสูตร...' ได้เลยครับ" 
            });
        }

        // 2. รับข้อความ
        if (event.type === "message" && event.message.type === "text") {
          const txt = event.message.text;
          
          // Trigger จ่ายเงิน
          if (["สมัคร", "premium", "จ่ายเงิน", "buy", "pay"].includes(txt.toLowerCase())) {
              return client.replyMessage(event.replyToken, [
                  { type: "text", text: "💎 Premium Access / Design Workshop (59.-)\n(Scan & Send Slip / ส่งสลิปเพื่อปลดล็อก)" },
                  { type: "image", originalContentUrl: QR_CODE_URL, previewImageUrl: QR_CODE_URL }
              ]);
          }

          // Check Premium (Mockup keywords)
          let isPremium = txt.includes("โอนแล้ว") || txt.includes("เจาะลึก") || txt.includes("ออกแบบ") || txt.includes("paid");
          
          const aiReply = await getAIResponse(txt, isPremium);
          
          let replyObj = { type: "text", text: aiReply };
          
          // Quick Reply (Free Mode Only)
          if (!isPremium) {
              replyObj.quickReply = createQuickReply([
                  { label: "🌧️ เศร้า/Sad", text: "รู้สึกเศร้า" },
                  { label: "⚡ กังวล/Anxious", text: "รู้สึกกังวล" },
                  { label: "💎 Premium", text: "สมัคร Premium" }
              ]);
          }
          return client.replyMessage(event.replyToken, replyObj);
        }
    }));
    return res.status(200).json({ status: "success" });
  } else { return res.status(405).json({ error: "Method not allowed" }); }
}
