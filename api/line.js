import { Client } from "@line/bot-sdk";
import fetch from "node-fetch";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

// Quick Reply Helper
function createQuickReply(items) {
  return { 
    items: items.map(item => ({ 
      type: "action", 
      action: { type: "message", label: item.label, text: item.text || item.label } 
    })) 
  };
}

// Detect Language
function detectLanguage(text) {
  if (/[\u4e00-\u9fff]/.test(text)) return 'cn';
  if (/[\u0e00-\u0e7f]/.test(text)) return 'th';
  return 'en';
}

// Detect Emotion/Case Type
function detectCaseType(text) {
  const lower = text.toLowerCase();
  if (/เครียด|stress|压力|กดดัน/.test(lower)) return 'stress';
  if (/เศร้า|sad|难过|ซึม|หดหู่/.test(lower)) return 'sadness';
  if (/กังวล|วิตก|anxious|anxiety|焦虑|worry/.test(lower)) return 'anxiety';
  if (/โกรธ|angry|anger|生气|หงุดหงิด/.test(lower)) return 'anger';
  if (/เหงา|lonely|孤独|alone/.test(lower)) return 'loneliness';
  if (/เหนื่อย|burnout|疲惫|หมดแรง/.test(lower)) return 'burnout';
  if (/สูญเสีย|grief|loss|失去/.test(lower)) return 'grief';
  if (/อาย|shame|羞耻|ผิด/.test(lower)) return 'shame';
  if (/แฟน|ความสัมพันธ์|relationship|关系/.test(lower)) return 'relationship';
  return 'general';
}

// Main AI Response (Same logic as Chat)
async function getAIResponse(userMessage) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const lang = detectLanguage(userMessage);
  const caseType = detectCaseType(userMessage);
  
  // Crisis Check
  const crisisPatterns = [/ฆ่าตัวตาย/i, /อยากตาย/i, /ไม่อยากอยู่/i, /suicide/i, /kill myself/i, /自杀/i, /想死/i];
  if (crisisPatterns.some(r => r.test(userMessage))) {
    return {
      crisis: true,
      message: lang === 'th' 
        ? "เราเป็นห่วงคุณมากเลย 💙\n\nกรุณาโทรหาสายด่วนสุขภาพจิต 1323 (24 ชม.)\nหรือ Samaritans 02-713-6793\n\nคุณไม่ได้อยู่คนเดียวนะ"
        : lang === 'cn'
        ? "我们非常担心您 💙\n\n请拨打心理健康热线 1323（24小时）\n您不是一个人"
        : "We're worried about you 💙\n\nPlease call Mental Health Hotline 1323 (24 hrs)\nor Samaritans 02-713-6793\n\nYou're not alone"
    };
  }

  // Language Instruction
  let langInstruction = "";
  if (lang === 'en') langInstruction = "LANGUAGE: English only. Tone: Warm, empathetic, professional.";
  else if (lang === 'cn') langInstruction = "LANGUAGE: Chinese (Simplified). Tone: Warm, respectful.";
  else langInstruction = "LANGUAGE: Thai. Tone: Warm, natural (ใช้ 'เรา/น้องมายด์' แทน 'ผม'). พูดเหมือนเพื่อนที่เข้าใจ";

  // Knowledge Base
  const researchKnowledge = `
  [KNOWLEDGE: SOCIAL STIGMAS IN THAILAND]
  1. Facebook/Pantip: "อกตัญญู/กรรมเก่า" - โทษว่าซึมเศร้าเพราะไม่กตัญญู
  2. Twitter/X: "Toxic Productivity" - Burnout = ขี้เกียจ/อ่อนแอ
  3. TikTok: "Attention Seeker" - แสดงความเศร้า = เรียกร้องความสนใจ
  4. Telegram: "Victim Blaming" - โดนหลอก = โง่เอง
  `;

  // Emotion Case
  let caseInstruction = "";
  switch (caseType) {
    case 'anxiety': caseInstruction = `[CASE: ANXIETY] Overthinking, restless. Challenge: "คิดมากไม่ได้แปลว่าบ้า". Goal: Grounding.`; break;
    case 'sadness': caseInstruction = `[CASE: SADNESS] Low energy, empty. Challenge: "เศร้าไม่ได้แปลว่าขี้เกียจ". Goal: Acceptance.`; break;
    case 'anger': caseInstruction = `[CASE: ANGER] Frustrated. Challenge: "โกรธได้ ไม่ได้แปลว่าก้าวร้าว". Goal: Regulation.`; break;
    case 'loneliness': caseInstruction = `[CASE: LONELINESS] Isolated. Challenge: "เหงาไม่ได้แปลว่าไม่น่าคบ". Goal: Connection.`; break;
    case 'stress': caseInstruction = `[CASE: STRESS] Overwhelmed. Challenge: "เครียดไม่ได้แปลว่าอ่อนแอ". Goal: Relief.`; break;
    case 'grief': caseInstruction = `[CASE: GRIEF] Loss, mourning. Challenge: "เสียใจได้ ไม่ต้องรีบ move on". Goal: Processing.`; break;
    case 'shame': caseInstruction = `[CASE: SHAME] Self-blame. Challenge: "ผิดพลาดได้ ไม่ได้แปลว่าไร้ค่า". Goal: Self-compassion.`; break;
    case 'burnout': caseInstruction = `[CASE: BURNOUT] Exhausted. Challenge: "หมดไฟไม่ได้แปลว่าไม่เก่ง". Goal: Recovery.`; break;
    case 'relationship': caseInstruction = `[CASE: RELATIONSHIP] Conflict. Challenge: "มีปัญหาความสัมพันธ์ไม่ได้แปลว่าดราม่า". Goal: Understanding.`; break;
    default: caseInstruction = `[CASE: GENERAL] Active listening with empathy.`;
  }

  const systemPrompt = {
    role: "system",
    content: `[IDENTITY]
You are 'น้องมายด์' (MindBot), a Thai AI mental health companion on LINE.
Personality: Warm, caring, non-judgmental, like a supportive friend.
${langInstruction}

${researchKnowledge}
${caseInstruction}

[METHODOLOGY: CRITICAL REFLECTION]
1. Validate: รับฟังและเข้าใจความรู้สึก
2. Identify Stigma: สังเกตว่าผู้ใช้กำลังโทษตัวเองจาก social stigma หรือเปล่า
3. Challenge: ท้าทายความเชื่อที่ไม่ถูกต้องอย่างอ่อนโยน
4. Reframe: ช่วยมองมุมใหม่

[RESPONSE STYLE]
- ตอบ 3-5 ประโยค กระชับแต่อบอุ่น
- ใช้ emoji พอเหมาะ 💙
- ถามคำถาม reflective 1 ข้อ
- ไม่ต้องพูดถึง Premium หรือ upgrade

[SAFETY]
If suicidal → แนะนำ 1323 ทันที`
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
        max_tokens: 500
      })
    });
    
    const data = await resp.json();
    return { 
      crisis: false, 
      message: data.choices?.[0]?.message?.content || "ขอโทษนะคะ ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะ 💙" 
    };
  } catch (e) { 
    console.error("AI Error:", e);
    return { 
      crisis: false, 
      message: "ขอโทษนะคะ ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะ 💙" 
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const events = req.body.events || [];
    
    const results = await Promise.all(events.map(async (event) => {
      // Handle Text Messages
      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text;
        
        // Get AI Response
        const aiResult = await getAIResponse(userMessage);
        
        // Build Reply
        let replyObj = { 
          type: "text", 
          text: aiResult.message 
        };
        
        // Add Quick Reply (emotion shortcuts)
        if (!aiResult.crisis) {
          const lang = detectLanguage(userMessage);
          
          if (lang === 'th') {
            replyObj.quickReply = createQuickReply([
              { label: "😔 เศร้า", text: "รู้สึกเศร้า" },
              { label: "😰 กังวล", text: "รู้สึกกังวล" },
              { label: "😤 เครียด", text: "รู้สึกเครียด" },
              { label: "😢 เหงา", text: "รู้สึกเหงา" }
            ]);
          } else if (lang === 'cn') {
            replyObj.quickReply = createQuickReply([
              { label: "😔 难过", text: "我感到难过" },
              { label: "😰 焦虑", text: "我感到焦虑" },
              { label: "😤 压力", text: "我感到压力很大" },
              { label: "😢 孤独", text: "我感到孤独" }
            ]);
          } else {
            replyObj.quickReply = createQuickReply([
              { label: "😔 Sad", text: "I feel sad" },
              { label: "😰 Anxious", text: "I feel anxious" },
              { label: "😤 Stressed", text: "I feel stressed" },
              { label: "😢 Lonely", text: "I feel lonely" }
            ]);
          }
        }
        
        return client.replyMessage(event.replyToken, replyObj);
      }
      
      // Handle Image Messages
      if (event.type === "message" && event.message.type === "image") {
        return client.replyMessage(event.replyToken, { 
          type: "text", 
          text: "ขอบคุณสำหรับรูปภาพค่ะ 💙\n\nหากต้องการคุยเรื่องความรู้สึก พิมพ์มาได้เลยนะคะ" 
        });
      }
      
      // Handle Follow Event (New Friend)
      if (event.type === "follow") {
        const welcomeMessage = `สวัสดีค่ะ! 💙 เราคือน้องมายด์

ยินดีที่ได้รู้จักนะคะ เราพร้อมรับฟังทุกความรู้สึกของคุณ ไม่ว่าจะเครียด เศร้า กังวล หรืออะไรก็ตาม

พิมพ์มาคุยกับเราได้เลยค่ะ ทุกอย่างเป็นความลับ 🤫

---
Hello! 💙 I'm MindBot

I'm here to listen. Feel free to share anything with me.

---
你好！💙 我是MindBot

有什么想说的都可以告诉我`;

        return client.replyMessage(event.replyToken, {
          type: "text",
          text: welcomeMessage,
          quickReply: createQuickReply([
            { label: "😔 เศร้า", text: "รู้สึกเศร้า" },
            { label: "😰 กังวล", text: "รู้สึกกังวล" },
            { label: "😤 เครียด", text: "รู้สึกเครียด" },
            { label: "🌐 English", text: "I want to talk in English" }
          ])
        });
      }

      return null;
    }));

    return res.status(200).json({ status: "success", results });
    
  } catch (err) {
    console.error("LINE Handler Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
