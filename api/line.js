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
  
  let modePrompt = isPremium 
    ? `[MODE: PREMIUM] Deep analysis using Research/DSM-5. Structure: Deconstruct Stigma -> Explain Mechanism -> Action Plan. (Length: 5-8 sentences)` 
    : `[MODE: FREE] Validate feeling -> Identify Stigma -> Reflect. (Length: 2-3 sentences)`;

  const systemPrompt = {
    role: "system",
    content: `[IDENTITY] You are 'MindBot' (LINE OA).
    **PRONOUNS:** Use "เรา", "MindBot", or "น้องมายด์". **AVOID "ผม".**
    **TONE:** Gender-neutral, warm.
    
    [KNOWLEDGE: THAI STIGMA & RESEARCH]
    - Social Stigmas: Facebook, Twitter, TikTok, Telegram (Scam/Victim Blaming).
    - Core Emotions: Anxiety, Sadness, Anger, Guilt, Fear, Embarrassment, Disgust, Offense.
    - **Task:** Detect which of the 8 emotions the user is feeling and address it.

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
                text: "✅ MindBot ได้รับสลิปแล้วค่ะ! (ระบบเปิดโหมด Premium ให้แล้ว)\n\nพิมพ์คำว่า 'เจาะลึก' หรือ 'P:' ตามด้วยเรื่องที่กังวลใจได้เลย เราพร้อมวิเคราะห์เต็มที่ 👇" 
            });
        }

        // 2. รับข้อความ
        if (event.type === "message" && event.message.type === "text") {
          const txt = event.message.text;
          
          if (["สมัคร", "premium", "เจาะลึก", "จ่ายเงิน"].includes(txt.toLowerCase())) {
              return client.replyMessage(event.replyToken, [
                  { type: "text", text: "💎 สแกนเพื่อปลดล็อกโหมดวิเคราะห์เชิงลึก (59.-)\n(โอนแล้วส่งรูปสลิปมาในแชทได้เลยค่ะ)" },
                  { type: "image", originalContentUrl: QR_CODE_URL, previewImageUrl: QR_CODE_URL }
              ]);
          }

          let isPremium = txt.includes("โอนแล้ว") || txt.includes("วิเคราะห์") || txt.includes("เจาะลึก");
          const aiReply = await getAIResponse(txt, isPremium);
          
          let replyObj = { type: "text", text: aiReply };
          if (!isPremium) {
              replyObj.quickReply = createQuickReply([
                  { label: "⚡ กังวล", text: "รู้สึกกังวล" },
                  { label: "🌧️ เศร้า", text: "รู้สึกเศร้า" },
                  { label: "🔥 โกรธ", text: "รู้สึกโกรธ" },
                  { label: "💎 สมัคร Premium", text: "สมัคร" }
              ]);
          }
          return client.replyMessage(event.replyToken, replyObj);
        }
    }));
    return res.status(200).json({ status: "success" });
  } else { return res.status(405).json({ error: "Method not allowed" }); }
}
