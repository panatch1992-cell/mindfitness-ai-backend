import { Client } from "@line/bot-sdk";
import fetch from "node-fetch";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

// QR Code สำหรับชำระเงิน
const QR_CODE_URL = "https://files.catbox.moe/f44tj4.jpg";

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
// MULTILINGUAL QUICK REPLIES
// ===========================================
const quickReplies = {
  th: [
    { label: "🌧️ รู้สึกเศร้า", text: "รู้สึกเศร้า" },
    { label: "⚡ กังวล/เครียด", text: "รู้สึกกังวลและเครียด" },
    { label: "😴 เหนื่อยมาก", text: "รู้สึกเหนื่อยมาก" },
    { label: "💎 Premium", text: "สมัคร Premium" }
  ],
  en: [
    { label: "🌧️ Feeling sad", text: "I'm feeling sad" },
    { label: "⚡ Anxious", text: "I'm feeling anxious" },
    { label: "😴 Exhausted", text: "I'm feeling exhausted" },
    { label: "💎 Premium", text: "Subscribe Premium" }
  ],
  cn: [
    { label: "🌧️ 感到难过", text: "我感到难过" },
    { label: "⚡ 焦虑", text: "我感到焦虑" },
    { label: "😴 很累", text: "我感到很累" },
    { label: "💎 高级版", text: "订阅高级版" }
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
// PAYMENT MESSAGES
// ===========================================
const paymentMessages = {
  th: "💎 ปลดล็อค Premium / Workshop Design\n\n✨ สิ่งที่จะได้รับ:\n• การวิเคราะห์เชิงลึก\n• ออกแบบหลักสูตรแบบละเอียด\n• การสนับสนุนแบบ 1:1\n\n💰 ราคา: 299 บาท\n\n📱 สแกน QR แล้วส่งสลิปมาเลยค่ะ",
  en: "💎 Unlock Premium / Workshop Design\n\n✨ What you'll get:\n• Deep analysis & support\n• Detailed curriculum design\n• 1:1 personalized help\n\n💰 Price: 299 THB (~$8)\n\n📱 Scan QR & send receipt",
  cn: "💎 解锁高级版 / 工作坊设计\n\n✨ 您将获得：\n• 深度分析支持\n• 详细课程设计\n• 1对1个性化帮助\n\n💰 价格：299泰铢\n\n📱 扫描二维码并发送收据"
};

// ===========================================
// AI RESPONSE - Human-like
// ===========================================
async function getAIResponse(userMessage, isPremium, lang = 'th') {
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

[MODE: ${isPremium ? 'PREMIUM - Deep support' : 'FREE - Brief support'}]

[SAFETY]
If any crisis indicators, provide hotline 1323 immediately.`;

  // Check for workshop keywords
  const workshopKeywords = /(workshop|training|course|อบรม|หลักสูตร|ออกแบบ|培训|课程)/i;
  const isWorkshop = workshopKeywords.test(userMessage);

  let systemPrompt = personalityPrompt;
  if (isWorkshop) {
    systemPrompt = isPremium
      ? `[PREMIUM WORKSHOP DESIGNER]\n${langConfig[lang]}\nDesign a detailed workshop curriculum. Include: Title, Objectives, Full Agenda with timing, Activities, Outcome.`
      : `[WORKSHOP CONSULTANT]\n${langConfig[lang]}\nProvide key principles and framework. Keep it high-level. Mention Premium for detailed agenda.`;
  }

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.8,
        max_tokens: isPremium ? 800 : 400,
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
      // 1. Handle Image (Payment Receipt)
      if (event.type === "message" && event.message.type === "image") {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "✅ ได้รับสลิปแล้วค่ะ!\n\nPremium ถูกเปิดใช้งานแล้ว 💎\n\nพิมพ์ 'เจาะลึก...' หรือ 'ออกแบบหลักสูตร...' ได้เลยนะคะ"
        });
      }

      // 2. Handle Text Message
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

        // Payment Request
        const payKeywords = ["สมัคร", "premium", "จ่ายเงิน", "buy", "pay", "购买", "充值", "订阅"];
        if (payKeywords.some(k => userText.toLowerCase().includes(k))) {
          return client.replyMessage(event.replyToken, [
            { type: "text", text: paymentMessages[lang] || paymentMessages.th },
            { type: "image", originalContentUrl: QR_CODE_URL, previewImageUrl: QR_CODE_URL }
          ]);
        }

        // Check Premium Status
        const premiumKeywords = ["โอนแล้ว", "paid", "已付", "เจาะลึก", "ออกแบบ", "deep", "design"];
        const isPremium = premiumKeywords.some(k => userText.toLowerCase().includes(k));

        // Get AI Response
        const aiReply = await getAIResponse(userText, isPremium, lang);

        let replyObj = { type: "text", text: aiReply };
        if (!isPremium) {
          replyObj.quickReply = createQuickReply(quickReplies[lang] || quickReplies.th);
        }

        return client.replyMessage(event.replyToken, replyObj);
      }

      // 3. Handle Follow Event (New Friend)
      if (event.type === "follow") {
        const welcomeMsg = `สวัสดีค่ะ! ยินดีต้อนรับสู่ MindBot 💙

เราคือเพื่อนที่พร้อมรับฟังและให้กำลังใจคุณ

💬 พิมพ์บอกความรู้สึกได้เลยนะ
🔒 ทุกการสนทนาเป็นความลับ

---
Hello! Welcome to MindBot 💙
I'm here to listen and support you.

---
你好！欢迎来到 MindBot 💙
我在这里倾听和支持你。`;

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
    }));

    return res.status(200).json({ status: "success", results });
  } catch (error) {
    console.error("Handler Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
