import { Client } from "@line/bot-sdk";
import fetch from "node-fetch";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);
// ⚠️ อย่าลืมแก้ลิงก์ QR Code ของคุณ
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

  // --- 3. Mode Selection (UPDATED WORKSHOP LOGIC) ---
  let modePrompt = "";
  
  // เช็คว่าอยากให้ออกแบบ Workshop ไหม
  const workshopKeywords = /(workshop|training|course|อบรม|หลักสูตร|培训|课程)/i;

  if (workshopKeywords.test(userMessage)) {
      if (isPremium) {
          // 💎 PREMIUM: ออกแบบละเอียด
          modePrompt = `[MODE: EXPERT WORKSHOP DESIGNER] Design a full, structured training curriculum (Title, Objectives, Agenda with times, Outcome). Professional tone.`;
      } else {
          // 🟢 FREE: ให้หลักการกว้างๆ
          modePrompt = `[MODE: MENTAL HEALTH CONSULTANT] Provide "Key Principles" and "Conceptual Framework" only. Do NOT give specific agenda. Upsell Premium for full design.`;
      }
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
          
          // Trigger จ่ายเงิน (รองรับ 3 ภาษา)
          const payKeywords = ["สมัคร", "premium", "จ่ายเงิน", "buy", "pay", "购买", "充值"];
          if (payKeywords.some(k => txt.toLowerCase().includes(k))) {
              return client.replyMessage(event.replyToken, [
                  { type: "text", text: "💎 Unlock Premium / Workshop Design (299.-)\n(Scan & Send Slip / สแกนแล้วส่งสลิป / 扫描并发送凭证)" },
                  { type: "image", originalContentUrl: QR_CODE_URL, previewImageUrl: QR_CODE_URL }
              ]);
          }

          // Check Premium Status (Mockup keywords)
          let isPremium = txt.includes("โอนแล้ว") || txt.includes("paid") || txt.includes("已付") || txt.includes("เจาะลึก") || txt.includes("ออกแบบ");
          
          const aiReply = await getAIResponse(txt, isPremium);
          
          let replyObj = { type: "text", text: aiReply };
          
          // Quick Reply (แสดงเฉพาะ Free Mode)
          if (!isPremium) {
              replyObj.quickReply = createQuickReply([
                  { label: "🌧️ Sad/เศร้า", text: "รู้สึกเศร้า" },
                  { label: "⚡ Anxious/กังวล", text: "รู้สึกกังวล" },
                  { label: "💎 Premium", text: "Premium" }
              ]);
          }
          return client.replyMessage(event.replyToken, replyObj);
        }
    }));
    return res.status(200).json({ status: "success" });
  } else { return res.status(405).json({ error: "Method not allowed" }); }
}
