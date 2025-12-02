import { Client } from "@line/bot-sdk";
import fetch from "node-fetch";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

// ===========================================
// LANGUAGE DETECTION
// ===========================================
function detectLanguage(text) {
  const thaiPattern = /[\u0E00-\u0E7F]/;
  const chinesePattern = /[\u4E00-\u9FFF]/;
  if (thaiPattern.test(text)) return 'th';
  if (chinesePattern.test(text)) return 'cn';
  return 'en';
}

// ===========================================
// QUICK REPLY BUILDER
// ===========================================
function createQuickReply(items) {
  return {
    items: items.map(item => ({
      type: "action",
      action: {
        type: "message",
        label: item.label.substring(0, 20),
        text: item.text || item.label
      }
    }))
  };
}

// ===========================================
// MULTILINGUAL QUICK REPLIES (ไม่มี Premium)
// ===========================================
const quickReplies = {
  th: [
    { label: "🌧️ รู้สึกเศร้า", text: "รู้สึกเศร้า" },
    { label: "⚡ กังวล/เครียด", text: "รู้สึกกังวลและเครียด" },
    { label: "😴 เหนื่อยมาก", text: "รู้สึกเหนื่อยมาก" },
    { label: "🧘 เครื่องมือช่วย", text: "แนะนำเครื่องมือช่วยจัดการความเครียด" }
  ],
  en: [
    { label: "🌧️ Feeling sad", text: "I'm feeling sad" },
    { label: "⚡ Anxious", text: "I'm feeling anxious" },
    { label: "😴 Exhausted", text: "I'm feeling exhausted" },
    { label: "🧘 Wellness tools", text: "Recommend stress management tools" }
  ],
  cn: [
    { label: "🌧️ 感到难过", text: "我感到难过" },
    { label: "⚡ 焦虑", text: "我感到焦虑" },
    { label: "😴 很累", text: "我感到很累" },
    { label: "🧘 减压工具", text: "推荐压力管理工具" }
  ]
};

// ===========================================
// CRISIS CHECK & RESPONSES
// ===========================================
function checkCrisis(text) {
  const crisisPatterns = [
    /ฆ่าตัวตาย/i, /อยากตาย/i, /ไม่อยากอยู่/i, /ทำร้ายตัวเอง/i,
    /suicide/i, /kill myself/i, /want to die/i, /end my life/i,
    /自杀/i, /想死/i, /不想活/i
  ];
  return crisisPatterns.some(r => r.test(text));
}

const crisisResponses = {
  th: "💙 เราเข้าใจว่าตอนนี้คุณรู้สึกหนักใจมาก\n\nคุณไม่ได้อยู่คนเดียวนะ กรุณาโทรหาสายด่วนสุขภาพจิต:\n📞 1323 (24 ชม.)\n📞 02-713-6793\n\nมีคนพร้อมรับฟังคุณอยู่เสมอ 🫂",
  en: "💙 We understand you're going through a really difficult time.\n\nYou're not alone. Please reach out:\n📞 1323 (Thailand 24hr)\n📞 Your local crisis line\n\nSomeone is always ready to listen 🫂",
  cn: "💙 我们理解您现在正经历非常艰难的时刻。\n\n您并不孤单。请拨打：\n📞 1323（泰国24小时）\n📞 您当地的危机热线\n\n总有人愿意倾听您 🫂"
};

// ===========================================
// TOOLKIT RESPONSES
// ===========================================
const toolkitResponses = {
  th: `🧘 เครื่องมือจัดการความเครียด:

1. 🌬️ การหายใจ 4-7-8
   หายใจเข้า 4 วิ นับค้าง 7 วิ หายใจออก 8 วิ

2. 🎯 Grounding 5-4-3-2-1
   มอง 5 สิ่ง, ฟัง 4 เสียง, สัมผัส 3 สิ่ง, ดม 2 กลิ่น, ลิ้มรส 1 รส

3. 📝 Gratitude Journal
   เขียน 3 สิ่งที่ขอบคุณในวันนี้

💡 ลองเข้าไปที่ mindfitness.co/mindspace/toolkit.html เพื่อใช้เครื่องมือเหล่านี้ได้เลยนะคะ`,
  en: `🧘 Stress Management Tools:

1. 🌬️ 4-7-8 Breathing
   Inhale 4s, hold 7s, exhale 8s

2. 🎯 5-4-3-2-1 Grounding
   See 5, hear 4, touch 3, smell 2, taste 1

3. 📝 Gratitude Journal
   Write 3 things you're grateful for today

💡 Try these tools at mindfitness.co/mindspace/toolkit.html`,
  cn: `🧘 压力管理工具：

1. 🌬️ 4-7-8 呼吸法
   吸气4秒，屏住7秒，呼气8秒

2. 🎯 5-4-3-2-1 接地法
   看5样，听4声，摸3样，闻2味，尝1味

3. 📝 感恩日记
   写下今天感激的3件事

💡 在 mindfitness.co/mindspace/toolkit.html 试试这些工具`
};

// ===========================================
// AI RESPONSE - Human-like
// ===========================================
async function getAIResponse(userMessage, lang = 'th') {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  const langConfig = {
    th: `[ภาษา: ไทย]
- ใช้ "เรา" หรือ "น้องมายด์" (ไม่ระบุเพศ)
- พูดเหมือนเพื่อนที่ห่วงใย
- ใช้คำลงท้ายอบอุ่น เช่น "นะ" "ค่ะ"
- ตอบสั้น 2-3 ประโยค`,
    en: `[Language: English]
- Use "I" or "MindBot"
- Speak like a caring friend
- Be warm but concise
- Keep responses to 2-3 sentences`,
    cn: `[语言：中文]
- 使用 "我" 或 "MindBot"
- 像关心人的朋友一样说话
- 保持简洁：2-3句`
  };

  const personalityPrompt = `[IDENTITY]
You are "น้องมายด์" (MindBot) - a warm, human-like peer supporter on LINE.
${langConfig[lang] || langConfig.th}

[PERSONALITY - CRITICAL]
1. รับฟังก่อน ไม่รีบแนะนำ
2. Validate ความรู้สึกก่อนทุกครั้ง
3. ถามคำถามเปิดให้เขาได้พูดต่อ
4. ไม่ตัดสิน ไม่สอน ไม่เทศนา

[AVOID - สิ่งที่ทำให้ดู AI]
- พูด "ขอบคุณที่เล่าให้ฟัง" ทุกครั้ง
- ตอบยาวเกินไป
- พูดแบบ textbook

[DO - สิ่งที่ทำให้ดู Human]
- ตอบสั้นบางครั้ง เช่น "เข้าใจนะ" "ยากจริงๆ"
- ใช้ emoji บ้าง แต่ไม่เยอะ
- ถามกลับเพื่อให้เขาได้พูดต่อ

[RESPONSE VARIATIONS]
ให้ vary การตอบ:
- "ฟังอยู่นะ"
- "เล่าต่อได้เลย"
- "อืม..."
- "แบบนี้เหรอ"
- "ยากจริงๆ เนอะ"
- "รู้สึกยังไงบ้างตอนนี้?"

[SAFETY]
If any crisis indicators, provide hotline 1323 immediately.`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: personalityPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.8,
        max_tokens: 400,
        presence_penalty: 0.6,
        frequency_penalty: 0.5
      })
    });
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || getDefaultResponse(lang);
  } catch (e) {
    console.error("AI Error:", e);
    return getDefaultResponse(lang);
  }
}

function getDefaultResponse(lang) {
  const defaults = {
    th: "ขอโทษนะ ระบบขัดข้องชั่วคราว ลองพิมพ์ใหม่อีกครั้งได้ไหมคะ? 🙏",
    en: "Sorry, there was a temporary issue. Could you try again? 🙏",
    cn: "抱歉，系统暂时出现问题。请再试一次？🙏"
  };
  return defaults[lang] || defaults.th;
}

// ===========================================
// MAIN HANDLER
// ===========================================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const events = req.body.events || [];
    
    const results = await Promise.all(events.map(async (event) => {
      // 1. Handle Text Message
      if (event.type === "message" && event.message.type === "text") {
        const userText = event.message.text;
        const lang = detectLanguage(userText);
        
        // Crisis Check
        if (checkCrisis(userText)) {
          return client.replyMessage(event.replyToken, {
            type: "text",
            text: crisisResponses[lang] || crisisResponses.th
          });
        }

        // Toolkit Request
        const toolkitKeywords = ["เครื่องมือ", "toolkit", "tools", "工具", "หายใจ", "breathing", "grounding", "ลดเครียด", "stress"];
        if (toolkitKeywords.some(k => userText.toLowerCase().includes(k))) {
          return client.replyMessage(event.replyToken, {
            type: "text",
            text: toolkitResponses[lang] || toolkitResponses.th,
            quickReply: createQuickReply(quickReplies[lang] || quickReplies.th)
          });
        }

        // Get AI Response
        const aiReply = await getAIResponse(userText, lang);

        return client.replyMessage(event.replyToken, {
          type: "text",
          text: aiReply,
          quickReply: createQuickReply(quickReplies[lang] || quickReplies.th)
        });
      }

      // 2. Handle Follow Event (New Friend)
      if (event.type === "follow") {
        const welcomeMsg = `สวัสดีค่ะ! ยินดีต้อนรับสู่ MindBot 💙

เราคือเพื่อนที่พร้อมรับฟังและให้กำลังใจคุณ

💬 พิมพ์บอกความรู้สึกได้เลยนะ
🧘 พิมพ์ "เครื่องมือ" เพื่อดูเทคนิคจัดการความเครียด
🔒 ทุกการสนทนาเป็นความลับ

---
Hello! Welcome to MindBot 💙
I'm here to listen and support you.

Type "tools" for stress management techniques.

---
你好！欢迎来到 MindBot 💙
我在这里倾听和支持你。

输入 "工具" 获取压力管理技巧。`;

        return client.replyMessage(event.replyToken, {
          type: "text",
          text: welcomeMsg,
          quickReply: createQuickReply([
            { label: "🇹🇭 ภาษาไทย", text: "สวัสดี" },
            { label: "🇬🇧 English", text: "Hello" },
            { label: "🇨🇳 中文", text: "你好" }
          ])
        });
      }

      // 3. Handle Image
      if (event.type === "message" && event.message.type === "image") {
        const lang = 'th';
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "ได้รับรูปภาพแล้วค่ะ 📷\n\nหากต้องการพูดคุย สามารถพิมพ์ข้อความมาได้เลยนะคะ 💙",
          quickReply: createQuickReply(quickReplies[lang])
        });
      }
    }));

    return res.status(200).json({ status: "success", results });
  } catch (error) {
    console.error("Handler Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
