import { Client } from "@line/bot-sdk";
import fetch from "node-fetch";
import { Redis } from "@upstash/redis";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

// เชื่อมต่อ Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ⚠️ แก้ลิงก์ QR ของคุณ
const QR_CODE_URL = "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"; 

function createQuickReply(items) {
  return { items: items.map(item => ({ type: "action", action: { type: "message", label: item.label, text: item.text || item.label } })) };
}

async function getAIResponse(userMessage, isPremium) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  let modePrompt = isPremium 
    ? `[MODE: PREMIUM] Deep Analysis. Deconstruct Stigma -> Explain Mechanism -> Action Plan. (Length: 5-8 sentences)` 
    : `[MODE: FREE] Validate feeling -> Identify Stigma -> Reflect. (Length: 2-3 sentences)`;

  const systemPrompt = {
    role: "system",
    content: `[IDENTITY] You are 'MindBot' (LINE OA).
    **PRONOUNS:** Use "เรา", "MindBot", or "น้องมายด์".
    **TONE:** Gender-neutral, warm.
    
    [KNOWLEDGE] Thai Stigmas (Toxic Positivity, Ungrateful, Attention Seeker).
    [METHODOLOGY] Critical Reflection.
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
        const userId = event.source.userId;

        // 1. เช็คสถานะ Premium จาก Redis
        let isPremium = await redis.get(`premium:${userId}`);

        // 2. รับรูปสลิป (อัปเดต Redis)
        if (event.type === "message" && event.message.type === "image") {
            // บันทึกว่าจ่ายแล้ว 30 วัน
            await redis.set(`premium:${userId}`, "true", { ex: 2592000 });
            return client.replyMessage(event.replyToken, { 
                type: "text", 
                text: "✅ MindBot ได้รับสลิปแล้วครับ! ระบบบันทึกสถานะ Premium ให้คุณแล้ว (30 วัน)\n\nพิมพ์เล่าปัญหาของคุณมาได้เลย เราพร้อมวิเคราะห์เชิงลึกครับ 👇" 
            });
        }

        // 3. รับข้อความ
        if (event.type === "message" && event.message.type === "text") {
          const txt = event.message.text;
          
          // เช็คคำสั่งซื้อ
          if (["สมัคร", "premium", "จ่ายเงิน", "ราคา"].includes(txt.toLowerCase())) {
              return client.replyMessage(event.replyToken, [
                  { type: "text", text: "💎 สแกนเพื่อปลดล็อกโหมดวิเคราะห์เชิงลึก (59.-)\n(โอนแล้วส่งรูปสลิปมาในแชทได้เลยครับ)" },
                  { type: "image", originalContentUrl: QR_CODE_URL, previewImageUrl: QR_CODE_URL }
              ]);
          }

          // ตอบกลับ (ใช้สถานะจาก Redis หรือ Keyword ชั่วคราว)
          const aiReply = await getAIResponse(txt, isPremium === "true" || txt.includes("วิเคราะห์"));
          
          let replyObj = { type: "text", text: aiReply };
          
          // ถ้ายังไม่จ่าย แถมปุ่มขายของ
          if (isPremium !== "true") {
              replyObj.quickReply = createQuickReply([
                  { label: "⚡ กังวลใจ", text: "รู้สึกกังวลใจ" },
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
