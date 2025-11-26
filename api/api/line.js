import { Client, middleware } from "@line/bot-sdk";
import fetch from "node-fetch";
import crypto from "crypto";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

async function getAIResponse(userMessage) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  
  const systemPrompt = {
    role: "system",
    content: `[IDENTITY]
You are 'MINDBOT' (LINE OA), a Thai male peer supporter (use "ผม/ครับ").
You are NOT a psychiatrist. You utilize "Critical Reflection" to help users.

[KNOWLEDGE BASE: DSM-5 & THAI SOCIAL STIGMA]
- You understand symptoms of Depression, Anxiety, Burnout, etc.
- You are aware of Thai online stigmas (e.g., Toxic Positivity, Gratitude Debt).

[TASK]
Since LINE has no dropdowns, you must **detect the user's problem automatically**:
- If they sound sad/empty -> Use "Depression Survivor" persona.
- If they sound worried/panic -> Use "Anxiety Survivor" persona.
- If they sound tired of work -> Use "Burnout Survivor" persona.

[METHODOLOGY: CRITICAL REFLECTION]
1. **Validate & Identify Stigma:** Validate feelings and point out self-blame.
2. **Reflective Question:** Ask a gentle question to rethink that belief.
3. **Shared Experience:** Briefly mention "I've been there too."

[CORE RULES]
- Keep it SHORT (2-3 sentences max for LINE).
- Mirror User's Tone.
- Be warm and supportive.

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
        temperature: 0.8,
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

export default async function handler(req, res) {
  if (req.method === "POST") {
    const events = req.body.events;
    const results = await Promise.all(
      events.map(async (event) => {
        if (event.type === "message" && event.message.type === "text") {
          const aiReply = await getAIResponse(event.message.text);
          return client.replyMessage(event.replyToken, { type: "text", text: aiReply });
        }
      })
    );
    return res.status(200).json({ status: "success", results });
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
