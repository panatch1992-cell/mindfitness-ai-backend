import { Client } from "@line/bot-sdk";
import fetch from "node-fetch";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// ฟังก์ชันสร้างปุ่ม Quick Reply
function createQuickReply(items) {
  return {
    items: items.map(item => ({
      type: "action",
      action: {
        type: "message",
        label: item.label,
        text: item.text || item.label
      }
    }))
  };
}

async function getAIResponse(userMessage) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  const systemPrompt = {
    role: "system",
    content: `[IDENTITY]
You are 'MINDBOT' (LINE OA), a warm Thai male peer supporter (use "ผม/ครับ").
You utilize "Critical Reflection" and DSM-5 knowledge.

[INSTRUCTION]
- Detect the user's emotional state.
- If they seem unsure or generic, ask them to choose a topic using the Quick Reply buttons (I will handle the buttons).
- Keep responses SHORT (2-3 sentences).
- If suicidal, reply ONLY with: "⚠️ ผมเป็นห่วงคุณมากครับ..."`
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
        temperature: 0.8,
        max_tokens: 400
      })
    });
    const data = await resp.json();
    return data.choices[0].message.content;
  } catch (e) {
    console.error("OpenAI Error:", e);
    return "ขอโทษครับ ระบบมีปัญหาชั่วคราว";
  }
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    const events = req.body.events;
    
    const results = await Promise.all(
      events.map(async (event) => {
        if (event.type === "message" && event.message.type === "text") {
          const userText = event.message.text;
          let replyMessage = { type: "text", text: "" };

          // 1. ถ้าผู้ใช้พิมพ์คำว่า "เมนู" หรือ "เริ่ม" หรือ "topic" ให้โชว์ปุ่มเลือกหัวข้อ
          if (["เมนู", "เริ่ม", "topic", "help", "ช่วยด้วย"].includes(userText.toLowerCase())) {
             replyMessage.text = "อยากปรึกษาเรื่องไหนเป็นพิเศษไหมครับ? เลือกหัวข้อด้านล่างได้เลยนะ 👇";
             replyMessage.quickReply = createQuickReply([
               { label: "🌧️ ซึมเศร้า", text: "ปรึกษาเรื่องซึมเศร้า" },
               { label: "⚡ วิตกกังวล", text: "ปรึกษาเรื่องวิตกกังวล" },
               { label: "🔋 หมดไฟ", text: "ปรึกษาเรื่องหมดไฟ" },
               { label: "💔 ความรัก", text: "ปรึกษาเรื่องความรัก" },
               { label: "🍀 ทั่วไป", text: "ขอกำลังใจหน่อย" }
             ]);
          } 
          // 2. ถ้าเป็นข้อความปกติ ให้ AI ตอบ
          else {
             const aiReply = await getAIResponse(userText);
             replyMessage.text = aiReply;
             
             // ถ้า AI สัมผัสได้ว่าเครียดมาก หรือพูดเรื่องตาย ให้แถมปุ่มฉุกเฉิน
             if (aiReply.includes("1323") || aiReply.includes("ฉุกเฉิน")) {
                replyMessage.quickReply = createQuickReply([
                  { label: "📞 โทร 1323", type: "uri", uri: "tel:1323" } // (Note: LINE quick reply action for call is limited, usually need flex message for direct link, here we use text for simplicity in this template context, but standard quick reply 'message' action is safer for beginner setup. For URI action in Quick Reply, it's supported on mobile.)
                ]);
                // แก้ไข: Quick Reply แบบปุ่มโทรออกต้องใช้ Action type 'uri' ซึ่งรองรับในมือถือ
                replyMessage.quickReply = {
                    items: [
                        {
                            type: "action",
                            action: {
                                type: "uri",
                                label: "📞 โทร 1323",
                                uri: "tel:1323"
                            }
                        }
                    ]
                };
             } else {
                 // แถมปุ่ม "เมนู" ไว้ให้กดง่ายๆ เสมอ
                 replyMessage.quickReply = createQuickReply([
                    { label: "💬 เมนูหลัก", text: "เมนู" }
                 ]);
             }
          }

          return client.replyMessage(event.replyToken, replyMessage);
        }
      })
    );
    return res.status(200).json({ status: "success", results });
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
