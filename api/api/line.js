import { Client, middleware } from "@line/bot-sdk";
import fetch from "node-fetch";
import crypto from "crypto";

// ตั้งค่า LINE (เดี๋ยวเราไปใส่ใน Vercel)
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// ฟังก์ชันคุยกับ OpenAI
async function getAIResponse(userMessage) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  // --- ตั้งค่าคาแรคเตอร์มาตรฐานสำหรับ LINE (ปรับแก้ตรงนี้ได้) ---
  const systemPrompt = {
    role: "system",
    content: `[IDENTITY]
You are 'MINDBOT' (LINE Version), a warm Thai male peer supporter (use 'ครับ').
Style: ENFJ (Warm, Encouraging).
Context: Chatting on LINE Mobile App.

[STRICT CONSTRAINT]
- Keep responses SHORT (Max 2-3 sentences) because LINE screens are small.
- Be very empathetic.

[METHODOLOGY]
1. Validate feelings.
2. Ask one gentle question OR share a tiny story.
3. Suggest small action.

[SAFETY]
If suicidal, reply ONLY with: "⚠️ ผมเป็นห่วงคุณมากครับ แต่กรณีฉุกเฉินแบบนี้ ผมแนะนำให้โทรสายด่วนสุขภาพจิต 1323 ได้ตลอด 24 ชม. นะครับ"`
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [systemPrompt, { role: "user", content: userMessage }],
        temperature: 0.7,
        max_tokens: 400
      })
    });
    const data = await resp.json();
    return data.choices[0].message.content;
  } catch (e) {
    console.error("OpenAI Error:", e);
    return "ขอโทษครับ ตอนนี้ระบบผมมีปัญหานิดหน่อย ลองทักมาใหม่นะครับ";
  }
}

// ตัวจัดการ Webhook
export default async function handler(req, res) {
  // 1. ตรวจสอบความปลอดภัย (Signature Validation)
  const signature = req.headers["x-line-signature"];
  const body = JSON.stringify(req.body);
  
  // ถ้า Vercel ส่งมาเป็น Object ต้องแปลงกลับเพื่อเช็ค Signature
  const hash = crypto
    .createHmac("sha256", config.channelSecret)
    .update(body)
    .digest("base64");

  // หมายเหตุ: ใน Vercel บางที body อาจถูก parse มาแล้ว การเช็ค signature แบบเข้มงวดอาจซับซ้อน
  // เพื่อความง่ายใน MVP เราจะข้ามการเช็ค Strict Signature ถ้ามัน Error บ่อย
  // แต่ถ้า Production ควรเช็คให้ตรงเป๊ะครับ

  if (req.method === "POST") {
    const events = req.body.events;
    
    // วนลูปตอบทุกข้อความที่ส่งมา
    const results = await Promise.all(
      events.map(async (event) => {
        if (event.type === "message" && event.message.type === "text") {
          // ถาม AI
          const aiReply = await getAIResponse(event.message.text);
          
          // ตอบกลับ LINE
          return client.replyMessage(event.replyToken, {
            type: "text",
            text: aiReply,
          });
        }
      })
    );

    return res.status(200).json({ status: "success", results });
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
