import { Client } from "@line/bot-sdk";
import fetch from "node-fetch";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);
// ใส่ลิงก์ QR Code ของคุณตรงนี้
const QR_CODE_URL = "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"; 

function createQuickReply(items) {
  return { items: items.map(item => ({ type: "action", action: { type: "message", label: item.label, text: item.text || item.label } })) };
}

async function getAIResponse(userMessage, isPremium) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  // --- Research & Stigma Knowledge ---
  const researchKnowledge = `
  [KNOWLEDGE: THAI STIGMA & RESEARCH]
  - Stigmas: "Toxic Positivity" (Just cheer up), "Ungrateful" (Family pressure), "Weakness" (Burnout).
  - Research: [YOUR RESEARCH GOES HERE]
  `;

  let modePrompt = isPremium 
    ? `[MODE: PREMIUM] Deep analysis using Research/DSM-5. Structure: Deconstruct Stigma -> Explain Mechanism -> Action Plan. (Length: 5-8 sentences)` 
    : `[MODE: FREE] Validate feeling -> Identify Stigma -> Ask 1 Reflective Question -> Upsell Premium if complex. (Length: 2-3 sentences)`;

  const systemPrompt = {
    role: "system",
    content: `[IDENTITY] You are 'MindBot' (LINE OA).
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
        temperature: 0.7, max_tokens: 800
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
        if (event.type === "message" && event.message.type === "text") {
          const txt = event.message.text;
          
          if (["สมัคร", "premium", "เจาะลึก", "จ่ายเงิน"].includes(txt.toLowerCase())) {
              return client.replyMessage(event.replyToken, [
                  { type: "text", text: "💎 สแกนเพื่อปลดล็อกโหมดวิเคราะห์เชิงลึก\n(พิมพ์ 'โอนแล้ว' เพื่อเริ่ม)" },
                  { type: "image", originalContentUrl: QR_CODE_URL, previewImageUrl: QR_CODE_URL }
              ]);
          }

          let isPremium = txt.includes("โอนแล้ว") || txt.includes("วิเคราะห์");
          const aiReply = await getAIResponse(txt, isPremium);
          
          let replyObj = { type: "text", text: aiReply };
          if (!isPremium) {
              replyObj.quickReply = createQuickReply([
                  { label: "💎 เจาะลึก", text: "สมัคร Premium" },
                  { label: "🌧️ ซึมเศร้า", text: "ปรึกษาเรื่องซึมเศร้า" },
                  { label: "🔋 หมดไฟ", text: "ปรึกษาเรื่องหมดไฟ" }
              ]);
          }
          return client.replyMessage(event.replyToken, replyObj);
        }
    }));
    return res.status(200).json({ status: "success" });
  } else { return res.status(405).json({ error: "Method not allowed" }); }
}
