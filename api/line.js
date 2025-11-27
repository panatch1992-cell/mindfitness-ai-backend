import { Client } from "@line/bot-sdk";
import fetch from "node-fetch";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

// ลิงก์ QR Code ของคุณ
const QR_CODE_URL = "https://files.catbox.moe/7v14nh.jpg"; 

function createQuickReply(items) {
  return { items: items.map(item => ({ type: "action", action: { type: "message", label: item.label, text: item.text || item.label } })) };
}

async function getAIResponse(userMessage, isPremium) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  // --- โหมดปกติ (ปรับให้ใจดีขึ้น ไม่ขายของพร่ำเพรื่อ) ---
  let modePrompt = `
  [MODE: STANDARD SUPPORT]
  - **Task:** Listen, Validate, and give Basic Advice.
  - **Constraint:** Answer the user's question directly but keep it concise (3-4 sentences).
  - **Soft Upsell:** ONLY IF the user asks for a "Detailed Plan" or "Deep Analysis", add a small note at the end: "(สำหรับบทวิเคราะห์เจาะลึกระดับ DSM-5 สามารถใช้โหมด Premium ได้นะครับ)"
  - **Do NOT block the conversation.** Help them first.
  `;

  // --- โหมด Premium (จัดเต็ม) ---
  if (isPremium) {
      modePrompt = `
      [MODE: PREMIUM DEEP DIVE]
      - **Task:** Act as a Senior Mental Health Analyst.
      - **Output:** 1. 🔍 **Root Cause:** Analyze why they feel this way (DSM-5 Ref).
        2. 🧠 **Cognitive Shift:** Challenge their stigma deeply.
        3. 🛠️ **Action Plan:** 3 concrete steps to do today.
      - **Length:** Detailed (6-10 sentences).
      `;
  }

  const systemPrompt = {
    role: "system",
    content: `[IDENTITY] You are 'MindBot' (LINE OA), a Thai male peer supporter (use "ผม/ครับ").
    
    [KNOWLEDGE BASE]
    - Symptoms of Depression, Anxiety, Burnout.
    - Thai Social Stigmas (Toxic Positivity, Ungrateful Child).

    [METHODOLOGY]
    1. Validate Feeling.
    2. Identify Stigma.
    3. Reflect & Advise.

    ${modePrompt}
    
    [SAFETY] If suicidal, reply ONLY with "⚠️ โทร 1323"`
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [systemPrompt, { role: "user", content: userMessage }],
        temperature: 0.8, max_tokens: isPremium ? 1200 : 500
      })
    });
    const data = await resp.json();
    return data.choices[0].message.content;
  } catch (e) { return "ระบบมีปัญหาเล็กน้อยครับ ลองทักมาใหม่นะ"; }
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    const events = req.body.events;
    const results = await Promise.all(events.map(async (event) => {
        
        // 1. กรณีลูกค้าส่ง "รูปภาพ" (ส่งสลิป)
        if (event.type === "message" && event.message.type === "image") {
            return client.replyMessage(event.replyToken, {
                type: "text",
                text: "✅ ได้รับสลิปแล้วครับ ขอบคุณที่สนับสนุน MindBot!\n\n🔓 **วิธีใช้โหมดเจาะลึก:**\nพิมพ์คำว่า 'เจาะลึก' หรือ 'P:' นำหน้าคำถาม\n\nเช่น: \"เจาะลึก รู้สึกหมดไฟ แก้ยังไงดี?\""
            });
        }

        // 2. กรณีส่งข้อความ
        if (event.type === "message" && event.message.type === "text") {
          const txt = event.message.text;
          
          // เช็คคำสั่งขอเลขบัญชี / สมัคร
          if (["สมัคร", "premium", "จ่ายเงิน", "ราคา", "โอนเงิน"].includes(txt.toLowerCase())) {
              return client.replyMessage(event.replyToken, [
                  { type: "text", text: "💎 **MindBot Premium (59.-)**\nวิเคราะห์ปมในใจเชิงลึก + แผนดูแลใจแบบ DSM-5\n\n👇 สแกน QR แล้ว **ส่งรูปสลิป** มาในแชทนี้ได้เลยครับ" },
                  { type: "image", originalContentUrl: QR_CODE_URL, previewImageUrl: QR_CODE_URL }
              ]);
          }

          // เช็คว่าเป็น Premium User หรือไม่ (ด้วยรหัสลับ)
          let isPremium = txt.startsWith("เจาะลึก") || txt.startsWith("P:") || txt.startsWith("p:");
          
          // ตัดคำว่า "เจาะลึก" ออกก่อนส่งให้ AI เพื่อไม่ให้งง
          let cleanText = txt.replace("เจาะลึก", "").replace("P:", "").replace("p:", "");

          const aiReply = await getAIResponse(cleanText, isPremium);
          
          let replyObj = { type: "text", text: aiReply };
          
          // ปุ่ม Quick Reply (แสดงเฉพาะโหมดฟรี เพื่อไม่ให้รกในโหมด Premium)
          if (!isPremium) {
              replyObj.quickReply = createQuickReply([
                  { label: "💎 สมัคร (59.-)", text: "สมัคร" },
                  { label: "🌧️ ปรึกษาซึมเศร้า", text: "ปรึกษาเรื่องซึมเศร้า" },
                  { label: "🔋 ปรึกษาหมดไฟ", text: "ปรึกษาเรื่องหมดไฟ" }
              ]);
          }

          return client.replyMessage(event.replyToken, replyObj);
        }
    }));
    return res.status(200).json({ status: "success" });
  } else { return res.status(405).json({ error: "Method not allowed" }); }
}
