import { Client } from "@line/bot-sdk";
import fetch from "node-fetch";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);
// ⚠️ แก้ลิงก์ QR Code ของคุณที่นี่
const QR_CODE_URL = "https://files.catbox.moe/f44tj4.jpg"; 

function createQuickReply(items) {
  return { items: items.map(item => ({ type: "action", action: { type: "message", label: item.label, text: item.text || item.label } })) };
}

async function getAIResponse(userMessage, isPremium) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  let modePrompt = isPremium 
    ? `[MODE: PREMIUM] Deep analysis using Research/DSM-5. Structure: Deconstruct Stigma -> Explain Mechanism -> Action Plan. (Length: 5-8 sentences)` 
    : `[MODE: FREE] Validate feeling -> Identify Stigma -> Ask 1 Reflective Question -> Upsell Premium if complex. (Length: 2-3 sentences)`;

  const systemPrompt = {
    role: "system",
    content: `[IDENTITY] You are 'MindBot' (LINE OA).
    **PRONOUNS:** Use "เรา", "MindBot", or "น้องมายด์".
    **TONE:** Gender-neutral, warm.
    
    [KNOWLEDGE] Thai Stigmas (Toxic Positivity, Ungrateful, Attention Seeker).
    [METHODOLOGY] Critical Reflection (Identify Stigma -> Challenge -> Reframe).
    ${modePrompt}
    
    [SAFETY] If suicidal, reply ONLY with "โทร 1323"`
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [systemPrompt, { role: "user", content: userMessage }],
        temperature: 0.8, max_tokens: 800
      })
    });
    const data = await resp.json();
    return data.choices[0].message.content;
  } catch (e) { return "ระบบมีปัญหาครับ"; }
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    const events = req.body.events;
    const results = await Promise.all(events.map(async (event) => {
        // 1. รับรูปสลิป
        if (event.type === "message" && event.message.type === "image") {
            return client.replyMessage(event.replyToken, { 
                type: "text", 
                text: "✅ MindBot ได้รับสลิปแล้วครับ! (ระบบจำสถานะ Premium แล้ว)\n\nพิมพ์คำว่า 'เจาะลึก' ตามด้วยปัญหาของคุณได้เลย เราพร้อมช่วยเต็มที่ครับ 👇" 
            });
        }

        // 2. รับข้อความ
        if (event.type === "message" && event.message.type === "text") {
          const txt = event.message.text;
          
          // เช็คคำสั่งซื้อ
          if (["สมัคร", "premium", "เจาะลึก", "จ่ายเงิน"].includes(txt.toLowerCase())) {
              return client.replyMessage(event.replyToken, [
                  { type: "text", text: "💎 สแกนเพื่อปลดล็อกโหมดวิเคราะห์เชิงลึก (59.-)\n(โอนแล้วส่งรูปสลิปมาในแชทได้เลยครับ)" },
                  { type: "image", originalContentUrl: QR_CODE_URL, previewImageUrl: QR_CODE_URL }
              ]);
          }

          // เช็คสถานะ Premium (รหัสลับ)
          let isPremium = txt.includes("โอนแล้ว") || txt.includes("วิเคราะห์") || txt.includes("เจาะลึก");
          const aiReply = await getAIResponse(txt, isPremium);
          
          let replyObj = { type: "text", text: aiReply };
          
          // ปุ่ม Quick Reply อิงอารมณ์ (สำหรับ Free User)
          if (!isPremium) {
              replyObj.quickReply = createQuickReply([
                  { label: "⚡ กังวลใจ", text: "รู้สึกกังวลใจ" },
                  { label: "🌧️ เศร้า", text: "รู้สึกเศร้า" },
                  { label: "🔥 โกรธ", text: "รู้สึกโกรธ" },
                  { label: "💎 สมัคร (59.-)", text: "สมัคร Premium" }
              ]);
          }
          return client.replyMessage(event.replyToken, replyObj);
        }
    }));
    return res.status(200).json({ status: "success" });
  } else { return res.status(405).json({ error: "Method not allowed" }); }
}
